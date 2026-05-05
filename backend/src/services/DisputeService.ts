// PURPOSE: Handles payment disputes (chargebacks)
// Customer raises dispute -> merchant responds -> officer resolves

import { pool } from '../config/database';
import { logger } from '../utils/logger';
import { logAudit } from './AuditLogger';

//Types

export interface Dispute {
  id: string;
  userId: number;
  transactionId: string;
  reason: string;
  status: 'OPEN' | 'MERCHANT_RESPONSE' | 'UNDER_REVIEW' | 'RESOLVED_REFUND' | 'RESOLVED_REJECTED';
  merchantResponse?: string;
  resolution?: string;
  resolvedBy?: number;
  createdAt: Date;
  updatedAt: Date;
}

//Functions

/*RAISE A DISPUTE
Customer says "I didn't make this payment" or "I was charged wrong amount" */
export async function raiseDispute(
  userId: number,
  transactionId: string,
  reason: string
): Promise<Dispute> {
  // Step 1: Check if transaction exists and belongs to this user
  const txResult = await pool.query(
    `SELECT id, status, amount, source_currency 
     FROM transactions 
     WHERE id = $1 AND user_id = $2`,
    [transactionId, userId]
  );

  if (txResult.rows.length === 0) {
    throw new Error('Transaction not found or does not belong to you');
  }

  const transaction = txResult.rows[0];

  // Can only dispute completed or confirmed transactions
  if (!['completed', 'confirmed'].includes(transaction.status)) {
    throw new Error(`Cannot dispute a transaction with status: ${transaction.status}`);
  }

  // Step 2: Check if dispute already exists for this transaction
  const existingDispute = await pool.query(
    `SELECT id FROM disputes 
     WHERE transaction_id = $1 AND status NOT IN ('RESOLVED_REFUND', 'RESOLVED_REJECTED')`,
    [transactionId]
  );

  if (existingDispute.rows.length > 0) {
    throw new Error('An active dispute already exists for this transaction');
  }

  // Step 3: Create the dispute
  const result = await pool.query(
    `INSERT INTO disputes 
     (user_id, transaction_id, reason, status)
     VALUES ($1, $2, $3, 'OPEN')
     RETURNING *`,
    [userId, transactionId, reason]
  );

  // Step 4: Update transaction status to 'disputed'
  await pool.query(
    `UPDATE transactions SET status = 'disputed', updated_at = NOW()
     WHERE id = $1`,
    [transactionId]
  );

  // Step 5: Audit log
  await logAudit(
    userId,
    'user',
    'dispute_raised',
    'transaction',
    transactionId,
    { reason, amount: transaction.amount, currency: transaction.source_currency },
    'system'
  );

  logger.info('Dispute raised', {
    disputeId: result.rows[0].id,
    transactionId,
    userId,
  });

  return mapRow(result.rows[0]);
}

/**
 * MERCHANT RESPONDS TO DISPUTE
 * Merchant provides evidence: "This payment was legit, here's proof"
 */

export async function merchantRespond(
  disputeId: string,
  merchantId: number,
  response: string
): Promise<Dispute> {
  const result = await pool.query(
    `UPDATE disputes SET
      merchant_response = $1,
      status = 'MERCHANT_RESPONSE',
      updated_at = NOW()
     WHERE id = $2 AND status = 'OPEN'
     RETURNING *`,
    [response, disputeId]
  );

  if (result.rows.length === 0) {
    throw new Error('Dispute not found or not in OPEN status');
  }

  await logAudit(
    merchantId,
    'merchant',
    'dispute_merchant_responded',
    'dispute',
    disputeId,
    { response },
    'system'
  );

  logger.info('Merchant responded to dispute', { disputeId, merchantId });

  return mapRow(result.rows[0]);
}

/**
 * RESOLVE DISPUTE — REFUND
 * Compliance officer sides with customer → refund the payment
 */
export async function resolveWithRefund(
  disputeId: string,
  officerId: number,
  resolution: string
): Promise<Dispute> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Update dispute status
    const disputeResult = await client.query(
      `UPDATE disputes SET
        status = 'RESOLVED_REFUND',
        resolution = $1,
        resolved_by = $2,
        updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [resolution, officerId, disputeId]
    );

    if (disputeResult.rows.length === 0) {
      throw new Error('Dispute not found');
    }

    const dispute = disputeResult.rows[0];

    // Update transaction status to 'refunded'
    await client.query(
      `UPDATE transactions SET status = 'refunded', updated_at = NOW()
       WHERE id = $1`,
      [dispute.transaction_id]
    );

    await client.query('COMMIT');

    await logAudit(
      officerId,
      'compliance_officer',
      'dispute_resolved_refund',
      'dispute',
      disputeId,
      { resolution, transactionId: dispute.transaction_id },
      'system'
    );

    logger.info('Dispute resolved with refund', { disputeId, officerId });

    return mapRow(disputeResult.rows[0]);

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * RESOLVE DISPUTE — REJECTED
 * Compliance officer sides with merchant → no refund
 */
export async function resolveRejected(
  disputeId: string,
  officerId: number,
  resolution: string
): Promise<Dispute> {
  // Update dispute status
  const result = await pool.query(
    `UPDATE disputes SET
      status = 'RESOLVED_REJECTED',
      resolution = $1,
      resolved_by = $2,
      updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [resolution, officerId, disputeId]
  );

  if (result.rows.length === 0) {
    throw new Error('Dispute not found');
  }

  // Put transaction back to confirmed
  await pool.query(
    `UPDATE transactions SET status = 'confirmed', updated_at = NOW()
     WHERE id = $1`,
    [result.rows[0].transaction_id]
  );

  await logAudit(
    officerId,
    'compliance_officer',
    'dispute_resolved_rejected',
    'dispute',
    disputeId,
    { resolution },
    'system'
  );

  logger.info('Dispute resolved — rejected', { disputeId, officerId });

  return mapRow(result.rows[0]);
}

/**
 * GET USER'S DISPUTES
 */
export async function getUserDisputes(
  userId: number,
  limit: number = 20,
  offset: number = 0
): Promise<{ disputes: Dispute[]; total: number }> {
  const countResult = await pool.query(
    `SELECT COUNT(*) FROM disputes WHERE user_id = $1`,
    [userId]
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const result = await pool.query(
    `SELECT * FROM disputes 
     WHERE user_id = $1 
     ORDER BY created_at DESC 
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );

  return {
    disputes: result.rows.map(row => mapRow(row)),
    total,
  };
}

/**
 * GET ALL DISPUTES (for compliance dashboard)
 */
export async function getAllDisputes(
  status?: string,
  limit: number = 20,
  offset: number = 0
): Promise<{ disputes: Dispute[]; total: number }> {
  let whereClause = '';
  const params: any[] = [];

  if (status) {
    params.push(status);
    whereClause = `WHERE status = $${params.length}`;
  }

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM disputes ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  params.push(limit);
  params.push(offset);

  const result = await pool.query(
    `SELECT * FROM disputes 
     ${whereClause}
     ORDER BY created_at DESC 
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return {
    disputes: result.rows.map(row => mapRow(row)),
    total,
  };
}

/**
 * GET SINGLE DISPUTE BY ID
 */
export async function getDisputeById(disputeId: string): Promise<Dispute | null> {
  const result = await pool.query(
    `SELECT * FROM disputes WHERE id = $1`,
    [disputeId]
  );

  if (result.rows.length === 0) return null;
  return mapRow(result.rows[0]);
}

/**
 * MAP database row to our Dispute type
 */
function mapRow(row: any): Dispute {
  return {
    id: row.id,
    userId: row.user_id,
    transactionId: row.transaction_id,
    reason: row.reason,
    status: row.status,
    merchantResponse: row.merchant_response,
    resolution: row.resolution,
    resolvedBy: row.resolved_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
