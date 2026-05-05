// PURPOSE: Daily batch settlement — collect all confirmed payments
// and calculate how much each merchant is owed

import { pool } from '../config/database';
import { logger } from '../utils/logger';
import { logAudit } from './AuditLogger';

//Types

export interface SettlementRecord {
  id: string;
  merchantId: string;
  totalAmount: number;
  totalFees: number;
  netAmount: number;
  currency: string;
  transactionCount: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
}

export interface SettlementSummary {
  totalMerchants: number;
  totalAmount: number;
  totalFees: number;
  totalNet: number;
  settlements: SettlementRecord[];
}

//config
const PLATFORM_FEE_PERCENT = 2.5; // PAYBRIDGE TAKES 2.5% PER TRANSACTION

//Functions

//Run Daily Settlement : goes through all confirmed transactions that haven't been settled yet, groups them by merchant, calculates fees, and created settlement records */

export async function runSettlement(): Promise<SettlementSummary> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    logger.info('Starting daily settlement run');

    const periodEnd = new Date();
    const periodStart = new Date();
    periodStart.setHours(0, 0, 0, 0); // Start of today

    // Step 1: Find all confirmed transactions not yet settled
    const unsettledResult = await client.query(
      `SELECT 
        merchant_id,
        source_currency as currency,
        COUNT(*) as tx_count,
        SUM(amount) as total_amount
       FROM transactions
       WHERE status = 'confirmed'
         AND settled = false
         AND merchant_id IS NOT NULL
       GROUP BY merchant_id, source_currency`
    );

    if (unsettledResult.rows.length === 0) {
      await client.query('COMMIT');
      logger.info('No unsettled transactions found');
      return {
        totalMerchants: 0,
        totalAmount: 0,
        totalFees: 0,
        totalNet: 0,
        settlements: [],
      };
    }

    const settlements: SettlementRecord[] = [];
    let totalAmount = 0;
    let totalFees = 0;
    let totalNet = 0;

    // Step 2: Create settlement record for each merchant + currency
    for (const row of unsettledResult.rows) {
      const amount = parseFloat(row.total_amount);
      const fees = Math.round(amount * (PLATFORM_FEE_PERCENT / 100) * 100) / 100;
      const net = Math.round((amount - fees) * 100) / 100;

      // Create settlement record
      const settlementResult = await client.query(
        `INSERT INTO settlements 
         (merchant_id, total_amount, total_fees, net_amount, currency,
          transaction_count, status, period_start, period_end)
         VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7, $8)
         RETURNING *`,
        [
          row.merchant_id,
          amount,
          fees,
          net,
          row.currency,
          parseInt(row.tx_count, 10),
          periodStart,
          periodEnd,
        ]
      );

      // Mark those transactions as settled
      await client.query(
        `UPDATE transactions SET 
          settled = true,
          settlement_id = $1,
          updated_at = NOW()
         WHERE merchant_id = $2 
           AND source_currency = $3
           AND status = 'confirmed' 
           AND settled = false`,
        [settlementResult.rows[0].id, row.merchant_id, row.currency]
      );

      const settlement = mapRow(settlementResult.rows[0]);
      settlements.push(settlement);

      totalAmount += amount;
      totalFees += fees;
      totalNet += net;

      logger.info('Settlement created for merchant', {
        merchantId: row.merchant_id,
        amount,
        fees,
        net,
        currency: row.currency,
        txCount: row.tx_count,
      });
    }

    await client.query('COMMIT');

    const summary: SettlementSummary = {
      totalMerchants: settlements.length,
      totalAmount: Math.round(totalAmount * 100) / 100,
      totalFees: Math.round(totalFees * 100) / 100,
      totalNet: Math.round(totalNet * 100) / 100,
      settlements,
    };

    logger.info('Daily settlement complete', {
      totalMerchants: summary.totalMerchants,
      totalAmount: summary.totalAmount,
      totalFees: summary.totalFees,
      totalNet: summary.totalNet,
    });

    return summary;

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Settlement run failed', { error });
    throw error;

  } finally {
    client.release();
  }
}

/**
 * MARK SETTLEMENT AS COMPLETED
 * After actually sending money to the merchant
 */
export async function completeSettlement(
  settlementId: string,
  adminId: number
): Promise<SettlementRecord> {
  const result = await pool.query(
    `UPDATE settlements SET
      status = 'COMPLETED',
      updated_at = NOW()
     WHERE id = $1 AND status = 'PENDING'
     RETURNING *`,
    [settlementId]
  );

  if (result.rows.length === 0) {
    throw new Error('Settlement not found or not in PENDING status');
  }

  await logAudit(
    adminId,
    'admin',
    'settlement_completed',
    'settlement',
    settlementId,
    { netAmount: result.rows[0].net_amount },
    'system'
  );

  logger.info('Settlement marked as completed', { settlementId });

  return mapRow(result.rows[0]);
}

/**
 * GET SETTLEMENT HISTORY
 */
export async function getSettlementHistory(
  merchantId?: string,
  limit: number = 20,
  offset: number = 0
): Promise<{ settlements: SettlementRecord[]; total: number }> {
  let whereClause = '';
  const params: any[] = [];

  if (merchantId) {
    params.push(merchantId);
    whereClause = `WHERE merchant_id = $${params.length}`;
  }

  const countResult = await pool.query(
    `SELECT COUNT(*) FROM settlements ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  params.push(limit);
  params.push(offset);

  const result = await pool.query(
    `SELECT * FROM settlements 
     ${whereClause}
     ORDER BY created_at DESC 
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  return {
    settlements: result.rows.map(row => mapRow(row)),
    total,
  };
}

/**
 * GET SINGLE SETTLEMENT
 */
export async function getSettlementById(settlementId: string): Promise<SettlementRecord | null> {
  const result = await pool.query(
    `SELECT * FROM settlements WHERE id = $1`,
    [settlementId]
  );

  if (result.rows.length === 0) return null;
  return mapRow(result.rows[0]);
}

/**
 * MAP database row to our type
 */
function mapRow(row: any): SettlementRecord {
  return {
    id: row.id,
    merchantId: row.merchant_id,
    totalAmount: parseFloat(row.total_amount),
    totalFees: parseFloat(row.total_fees),
    netAmount: parseFloat(row.net_amount),
    currency: row.currency,
    transactionCount: row.transaction_count,
    status: row.status,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    createdAt: row.created_at,
  };
}
