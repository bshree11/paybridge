import { query } from "../config/database";
import { checkIdempotency, saveIdempotency } from "./IdempotencyService";
import FraudDetectionService from "./FraudDetectionService";
import SARService from "./SARService";
import { checkVelocity } from "./VelocityCheckService";
import { stripeProcessor } from "../processors/StripeProcessor";
import { logAudit } from "./AuditLogger";
import { AppError, ValidationError, ForbiddenError } from "../utils/errors";
import { logger } from "../utils/logger";

export async function createPayment(
  userId: number,
  amount: number,
  currency: string,
  cardToken: string,
  idempotencyKey: string,
  ipAddress: string,
) {
  // Step 1: Check KYC status
  const userResult = await query("SELECT kyc_status FROM users WHERE id = $1", [
    userId,
  ]);
  if (userResult.rows[0].kyc_status !== "verified") {
    throw new ForbiddenError("KYC verification required");
  }

  // Step 2: Check idempotency
  const cached = await checkIdempotency(idempotencyKey, userId);
  if (cached) {
    return cached;
  }

  // Step 3: Velocity check
  const velocity = await checkVelocity(userId, amount);
  if (!velocity.passed) {
    throw new AppError(
      velocity.reason || "Velocity check failed",
      429,
      "VELOCITY_LIMIT",
    );
  }

  // Step 4: FRAUD CHECK
  const fraudResult = await FraudDetectionService.checkTransaction({
    userId: String(userId),
    amount: amount,
    currency: currency,
  });

  // REJECT — block payment and auto-create SAR
  if (fraudResult.decision === "REJECT") {
    await SARService.createFromFraudCheck(fraudResult);
    throw new AppError("Transaction blocked due to suspicious activity", 403, "FRAUD_REJECTED");
  }

  // REVIEW — require 2FA verification before proceeding
  if (fraudResult.decision === "REVIEW") {
    throw new AppError(
      "Additional verification required. Please complete 2FA.",
      202,
      "FRAUD_REVIEW",
    );
  }

  // Step 5: Create transaction record (status: pending)
  const txResult = await query(
    `INSERT INTO transactions
        (user_id, amount, source_currency, target_currency, processor, idempotency_key, status)
        VALUES ($1, $2, $3, $3, 'stripe', $4, 'pending')
        RETURNING id, status`,
    [userId, amount, currency, idempotencyKey],
  );

  const transaction = txResult.rows[0];

  // Step 6: Charge via Stripe
  const chargeResult = await stripeProcessor.charge(
    amount,
    currency,
    cardToken,
  );
  if (!chargeResult.success) {
    await query(
      `UPDATE transactions 
            SET status = 'failed'
            WHERE id = $1`,
      [transaction.id],
    );

    throw new AppError(
      chargeResult.error || "Payment failed",
      400,
      "PAYMENT_FAILED",
    );
  }

  // Step 7: Update transaction with charge ID
  await query(
    `UPDATE transactions 
        SET status = 'confirmed',
        processor_charge_id = $1
        WHERE id = $2`,
    [chargeResult.chargeId, transaction.id],
  );

  // Step 8: Build response
  const response = {
    transactionId: transaction.id,
    amount,
    currency,
    status: "confirmed",
    chargeId: chargeResult.chargeId,
  };

  // Step 9: Save idempotency
  await saveIdempotency(idempotencyKey, userId, transaction.id, response);

  // Step 10: Audit log
  await logAudit(
    userId,
    "user",
    "payment_created",
    "transaction",
    transaction.id,
    { amount, currency },
    ipAddress,
  );
  logger.info("Payment processed", {
    transactionId: transaction.id,
    amount,
    currency,
  });
  return response;
}

export async function getPayment(transactionId: string, userId: number) {
  const result = await query(
    `SELECT id, amount, source_currency,
        target_currency, status, processor,
        fraud_score, created_at FROM transactions
        WHERE id = $1 AND user_id = $2`,
    [transactionId, userId],
  );

  if (result.rows.length === 0) {
    throw new AppError("Transaction not found", 404, "NOT_FOUND");
  }

  return result.rows[0];
}

export async function getUserPayments(userId: number) {
  const result = await query(
    `SELECT id, amount, source_currency,
        target_currency, status, processor,
        fraud_score, created_at
        FROM transactions
        WHERE user_id = $1
        ORDER BY created_at DESC`,
    [userId],
  );
  return result.rows;
}