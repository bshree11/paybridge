/* PURPOSE: Handles GDPR rights - data export the account anoynmization. Users can request all their data or delete their account */

import { pool } from "../config/database";
import { logger } from "../utils/logger";
import { logAudit } from "./AuditLogger";

//Types

export interface DataExport {
  exportedAt: string;
  user: any;
  transactions: any[];
  kycRecords: any[];
  fraudChecks: any[];
  disputes: any[];
  auditlogs: any[];
  ledgerEntries: any[];
}

// Functions

/* Export user data - collects ALL data we have about a user from every table returns it as a JSON object */

export async function exportUserData(userId: number): Promise<DataExport> {
  logger.info("Starting GDPR data export", { userId });

  //Get user profile (exclude hashed password)
  const userResult = await pool.query(
    `SELECT id, email, first_name, last_name, role, default)currency, kyc_status, two_factor_enabled, created_at, updated_at FROM users WHERE id = $1`,
    [userId],
  );

  //Get all transactions
  const transactionsResult = await pool.query(
    `SELECT id, amount, source_currency, target_currency, status, processor, created_at FROM transactions WHERE user_id = $1`,
    [userId],
  );

  //Get KYC records
  const kycResult = await pool.query(
    `SELECT id, document_type, status, submitted_at, reviewed_at FROM kyc_documents WHERE user_id = $1
        ORDER BY sumbmitted_at DESC`,
    [userId],
  );

  //Get fraud checks
  const fraudResult = await pool.query(
    `SELECT id, transaction_amount, currency, total_score, decision, checked_at FROM fraud_checks WHERE user_id = $1 ORDER BY checked_at DESC`,
    [userId],
  );

  //Get disputes
  const disputesResult = await pool.query(
    `SELECT id, transaction_id, reason, status, created_at FROM disputes WHERE user_id = $1
        ORDER BY created_at DESC`,
    [userId],
  );

  //Get audit logs related to this user
  const auditResult = await pool.query(
    `SELECT id, action, entity_type, entity_id, created_at FROM audit_logs WHERE user_id = $1
        ORDER BY created_at DESC`,
    [userId],
  );

  //Get ledger entries
  const ledgerResult = await pool.query(
    `SELECT id, transaction_id, entry_type, amount, currency, balance_before, balance_after, created_at FROM ledger_entries WHERE account_id = $1::text
        ORDER BY created_at DESC`,
    [userId],
  );

  const exportData: DataExport = {
    exportedAt: new Date().toISOString(),
    user: userResult.rows[0] || null,
    transactions: transactionsResult.rows,
    kycRecords: kycResult.rows,
    fraudChecks: fraudResult.rows,
    disputes: disputesResult.rows,
    auditlogs: auditResult.rows,
    ledgerEntries: ledgerResult.rows,
  };

  //Log that export happened (audit trail)
  await logAudit(
    userId,
    "user",
    "gdpr_data_export",
    "user",
    String(userId),
    { tablesExported: 7 },
    "system",
  );

  logger.info("GDPR data export complete", {
    userId,
    transactionCount: transactionsResult.rows.length,
    totalRecords:
      transactionsResult.rows.length +
      kycResult.rows.length +
      fraudResult.rows.length +
      disputesResult.rows.length +
      auditResult.rows.length +
      ledgerResult.rows.length,
  });
  return exportData;
}

/* DELETE / ANONYNMIZE ACCOUNT 
We can't fully delete becuase FCA requires 5-year record retention so instead we are ANONYMIZE -replace personal data with 'DELETED' the records stay but can't be linked back to the person*/

export async function anonymizeAccount(userId: number): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    logger.info("Starting GDPR account anonymization", { userId });

    //Step 1: Anonymize user profile
    const timestamp = Date.now();
    await client.query(
      `UPDATE users SET
            email = $1,
            first_name = 'DELETED',
            last-name = "User",
            password_hash = "ANONYMIZED",
            two_factor_secret = NULL,
            two_factor_enabled = false,
            updated_at = NOW()
            WHERE id = $2`,
      [`deleted_${timestamp}@anonymized.com`, userId],
    );
    // Step 2: Anonymize KYC documents
    // Remove personal document data but keep the record
    await client.query(
      `UPDATE kyc_documents SET
        document_data = '{"anonymized": true}',
        document_type = 'ANONYMIZED',
        updated_at = NOW()
       WHERE user_id = $1`,
      [userId],
    );
    // Step 3: Remove user from SAR assignments
    // Don't delete SARs themselves — they're legal records
    await client.query(
      `UPDATE suspicious_activity_reports SET
        notes = notes || $1::jsonb,
        updated_at = NOW()
       WHERE user_id = $2`,
      [
        JSON.stringify([
          {
            note: "User account anonymized under GDPR right to erasure",
            by: "SYSTEM",
            at: new Date().toISOString(),
          },
        ]),
        userId,
      ],
    );

    // Step 4: Invalidate all sessions (Redis)
    // User can no longer log in after anonymization

    // Step 5: Log the anonymization
    await client.query(
      `INSERT INTO audit_logs 
       (user_id, actor_type, action, entity_type, entity_id, metadata, ip_address)
       VALUES ($1, 'system', 'gdpr_account_anonymized', 'user', $2, $3, 'system')`,
      [
        userId,
        String(userId),
        JSON.stringify({
          reason: "User requested account deletion under GDPR Article 17",
          anonymizedAt: new Date().toISOString(),
        }),
      ],
    );

    await client.query("COMMIT");

    logger.info("GDPR account anonymization complete", { userId });
  } catch (error) {
    await client.query("ROLLBACK");
    logger.error("GDPR anonymization failed", { userId, error });
    throw error;
  } finally {
    client.release();
  }
}


/**
 * CHECK IF ACCOUNT IS ALREADY ANONYMIZED
 */
export async function isAnonymized(userId: number): Promise<boolean> {
  const result = await pool.query(
    `SELECT email FROM users WHERE id = $1`,
    [userId]
  );

  if (result.rows.length === 0) return true;

  return result.rows[0].email.includes('@anonymized.com');
}

/**
 * GET CONSENT STATUS
 * Check what the user has consented to
 */
export async function getConsentStatus(userId: number): Promise<any> {
  const result = await pool.query(
    `SELECT data_processing_consent, marketing_consent,
            analytics_consent, consent_updated_at
     FROM users WHERE id = $1`,
    [userId]
  );

  return result.rows[0] || null;
}

/**
 * UPDATE CONSENT
 * User can change what they consent to at any time
 */
export async function updateConsent(
  userId: number,
  dataProcessing: boolean,
  marketing: boolean,
  analytics: boolean
): Promise<void> {
  await pool.query(
    `UPDATE users SET
      data_processing_consent = $1,
      marketing_consent = $2,
      analytics_consent = $3,
      consent_updated_at = NOW(),
      updated_at = NOW()
     WHERE id = $4`,
    [dataProcessing, marketing, analytics, userId]
  );

  await logAudit(
    userId,
    'user',
    'gdpr_consent_updated',
    'user',
    String(userId),
    { dataProcessing, marketing, analytics },
    'system'
  );

  logger.info('GDPR consent updated', {
    userId,
    dataProcessing,
    marketing,
    analytics,
  });
}