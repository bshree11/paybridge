// PURPOSE: Double-entry bookkeeping — every payment creates a DEBIT + CREDIT
// All entries are atomic (both save or neither saves)

import { pool } from '../config/database';
import { logger } from '../utils/logger';

// --- Types ---

export interface LedgerEntry {
  id: string;
  transactionId: string;
  accountId: string;
  entryType: 'DEBIT' | 'CREDIT';
  amount: number;
  currency: string;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  createdAt: Date;
}

export interface LedgerPair {
  debit: LedgerEntry;
  credit: LedgerEntry;
}

// --- Helper: Map database row to our type ---

function mapRow(row: any): LedgerEntry {
  return {
    id: row.id,
    transactionId: row.transaction_id,
    accountId: row.account_id,
    entryType: row.entry_type,
    amount: parseFloat(row.amount),
    currency: row.currency,
    balanceBefore: parseFloat(row.balance_before),
    balanceAfter: parseFloat(row.balance_after),
    description: row.description,
    createdAt: row.created_at,
  };
}

// --- Helper: Get balance with row lock ---

async function getBalance(
  client: any,
  accountId: string,
  currency: string
): Promise<number> {
  const result = await client.query(
    `SELECT balance FROM accounts 
     WHERE id = $1 AND currency = $2
     FOR UPDATE`,
    [accountId, currency]
  );

  if (result.rows.length === 0) {
    return 0;
  }

  return parseFloat(result.rows[0].balance);
}

// --- Main Functions ---

/**
 * RECORD PAYMENT
 * Creates a DEBIT on sender + CREDIT on receiver
 * Both inside BEGIN/COMMIT so it's atomic
 */
export async function recordPayment(
  transactionId: string,
  fromAccountId: string,
  toAccountId: string,
  amount: number,
  currency: string,
  description: string
): Promise<LedgerPair> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get current balances (locked so no one else can change them)
    const fromBalance = await getBalance(client, fromAccountId, currency);
    const toBalance = await getBalance(client, toAccountId, currency);

    // Check if sender has enough money
    if (fromBalance < amount) {
      throw new Error(`Insufficient balance. Available: ${fromBalance}, Required: ${amount}`);
    }

    // Create DEBIT entry (money leaving sender)
    const debitResult = await client.query(
      `INSERT INTO ledger_entries 
       (transaction_id, account_id, entry_type, amount, currency,
        balance_before, balance_after, description)
       VALUES ($1, $2, 'DEBIT', $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        transactionId,
        fromAccountId,
        amount,
        currency,
        fromBalance,
        fromBalance - amount,
        description,
      ]
    );

    // Create CREDIT entry (money arriving at receiver)
    const creditResult = await client.query(
      `INSERT INTO ledger_entries 
       (transaction_id, account_id, entry_type, amount, currency,
        balance_before, balance_after, description)
       VALUES ($1, $2, 'CREDIT', $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        transactionId,
        toAccountId,
        amount,
        currency,
        toBalance,
        toBalance + amount,
        description,
      ]
    );

    // Update account balances
    await client.query(
      `UPDATE accounts SET balance = balance - $1, updated_at = NOW() 
       WHERE id = $2 AND currency = $3`,
      [amount, fromAccountId, currency]
    );

    await client.query(
      `UPDATE accounts SET balance = balance + $1, updated_at = NOW() 
       WHERE id = $2 AND currency = $3`,
      [amount, toAccountId, currency]
    );

    // COMMIT — save everything together
    await client.query('COMMIT');

    logger.info('Ledger entries created', {
      transactionId,
      from: fromAccountId,
      to: toAccountId,
      amount,
      currency,
    });

    return {
      debit: mapRow(debitResult.rows[0]),
      credit: mapRow(creditResult.rows[0]),
    };

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Ledger entry failed, rolled back', { error, transactionId });
    throw error;

  } finally {
    client.release();
  }
}

/**
 * RECORD REFUND
 * Opposite of payment — money goes back to customer
 */
export async function recordRefund(
  transactionId: string,
  fromAccountId: string,
  toAccountId: string,
  amount: number,
  currency: string,
  description: string
): Promise<LedgerPair> {
  return recordPayment(
    transactionId,
    fromAccountId,
    toAccountId,
    amount,
    currency,
    `REFUND: ${description}`
  );
}

/**
 * GET ALL ENTRIES for a transaction
 */
export async function getEntriesByTransaction(transactionId: string): Promise<LedgerEntry[]> {
  const result = await pool.query(
    `SELECT * FROM ledger_entries 
     WHERE transaction_id = $1 
     ORDER BY created_at`,
    [transactionId]
  );
  return result.rows.map(row => mapRow(row));
}

/**
 * GET ACCOUNT HISTORY
 * Shows all money movements for an account
 */
export async function getAccountHistory(
  accountId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{ entries: LedgerEntry[]; total: number }> {
  const countResult = await pool.query(
    `SELECT COUNT(*) FROM ledger_entries WHERE account_id = $1`,
    [accountId]
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const result = await pool.query(
    `SELECT * FROM ledger_entries 
     WHERE account_id = $1 
     ORDER BY created_at DESC 
     LIMIT $2 OFFSET $3`,
    [accountId, limit, offset]
  );

  return {
    entries: result.rows.map(row => mapRow(row)),
    total,
  };
}

/**
 * VERIFY BOOKS ARE BALANCED
 * Total debits must equal total credits
 * Run this daily as a health check
 */
export async function verifyBalance(): Promise<{
  balanced: boolean;
  totalDebits: number;
  totalCredits: number;
}> {
  const result = await pool.query(`
    SELECT 
      SUM(CASE WHEN entry_type = 'DEBIT' THEN amount ELSE 0 END) as total_debits,
      SUM(CASE WHEN entry_type = 'CREDIT' THEN amount ELSE 0 END) as total_credits
    FROM ledger_entries
  `);

  const totalDebits = parseFloat(result.rows[0].total_debits) || 0;
  const totalCredits = parseFloat(result.rows[0].total_credits) || 0;

  const balanced = Math.abs(totalDebits - totalCredits) < 0.01;

  if (!balanced) {
    logger.error('LEDGER IMBALANCE DETECTED', { totalDebits, totalCredits });
  }

  return { balanced, totalDebits, totalCredits };
}