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

export async function runSettlement(): Promise<any> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const periodEnd = new Date();
    const periodStart = new Date();
    periodStart.setHours(0, 0, 0, 0);

    const unsettledResult = await client.query(
      `SELECT source_currency as currency, COUNT(*) as tx_count, SUM(amount) as total_amount
       FROM transactions
       WHERE status = 'confirmed'
       AND created_at >= $1 AND created_at <= $2
       GROUP BY source_currency`,
      [periodStart, periodEnd]
    );

    if (unsettledResult.rows.length === 0) {
      await client.query('COMMIT');
      return { totalAmount: 0, totalFees: 0, totalNet: 0, settlements: [] };
    }

    const settlements: any[] = [];
    let totalAmount = 0;
    let totalFees = 0;

    for (const row of unsettledResult.rows) {
      const amount = parseFloat(row.total_amount);
      const fees = Math.round(amount * (2.5 / 100) * 100) / 100;
      const net = Math.round((amount - fees) * 100) / 100;

      settlements.push({
        currency: row.currency,
        txCount: parseInt(row.tx_count, 10),
        totalAmount: amount,
        fees,
        net,
      });

      totalAmount += amount;
      totalFees += fees;
    }

    await client.query('COMMIT');

    return {
      totalAmount: Math.round(totalAmount * 100) / 100,
      totalFees: Math.round(totalFees * 100) / 100,
      totalNet: Math.round((totalAmount - totalFees) * 100) / 100,
      settlements,
    };

  } catch (error) {
    await client.query('ROLLBACK');
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
