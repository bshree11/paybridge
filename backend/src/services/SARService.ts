// PURPOSE: Manages Suspicious Activity Reports (SARs)
// Auto-creates SAR when fraud score > 70
// Compliance officers can add notes, escalate, resolve, or file SARs

import { pool } from '../config/database';
import { logger } from '../utils/logger';
import { FraudCheckResult } from './FraudDetectionService';

// Types 

export interface SARNote {
  note: string;
  by: string;       // officer's user ID
  at: string;       // ISO timestamp
}

export interface SAR {
  id: string;
  referenceNumber: string;
  userId: string;
  transactionId?: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'ESCALATED' | 'RESOLVED' | 'FILED';
  reason: string;
  fraudScore?: number;
  triggeredRules: any[];
  notes: SARNote[];
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assignedTo?: string;
  createdAt: Date;
}

// The Service 

class SARService {

  /**
   * AUTO-CREATE SAR
   * Called automatically when fraud score > 70
   */
  async createFromFraudCheck(
    fraudResult: FraudCheckResult,
    transactionId?: string
  ): Promise<SAR> {
    // Generate reference like SAR-2025-000001
    const refResult = await pool.query(
      `SELECT nextval('sar_reference_seq') as seq`
    );
    const seq = refResult.rows[0].seq;
    const year = new Date().getFullYear();
    const referenceNumber = `SAR-${year}-${String(seq).padStart(6, '0')}`;

    // Priority based on score
    let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    if (fraudResult.totalScore >= 90) {
      priority = 'CRITICAL';
    } else if (fraudResult.totalScore >= 80) {
      priority = 'HIGH';
    } else {
      priority = 'MEDIUM';
    }

    // Build reason from triggered rules
    const triggeredRules = fraudResult.rules.filter(r => r.triggered);
    const reason = `Auto-generated: Fraud score ${fraudResult.totalScore}/100. ` +
      `Triggered rules: ${triggeredRules.map(r => r.rule).join(', ')}`;

    const result = await pool.query(
      `INSERT INTO suspicious_activity_reports 
       (reference_number, user_id, transaction_id, status, reason, 
        fraud_score, triggered_rules, priority, notes)
       VALUES ($1, $2, $3, 'OPEN', $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        referenceNumber,
        fraudResult.transactionData.userId,
        transactionId || null,
        reason,
        fraudResult.totalScore,
        JSON.stringify(triggeredRules),
        priority,
        JSON.stringify([{
          note: 'SAR auto-created by fraud detection system',
          by: 'SYSTEM',
          at: new Date().toISOString(),
        }]),
      ]
    );

    logger.warn('SAR created', {
      referenceNumber,
      userId: fraudResult.transactionData.userId,
      fraudScore: fraudResult.totalScore,
      priority,
    });

    return this.mapRow(result.rows[0]);
  }

  /**
   * MANUAL CREATE SAR
   * Compliance officers can create SARs manually
   */
  async createManual(
    userId: string,
    reason: string,
    officerId: string,
    transactionId?: string
  ): Promise<SAR> {
    const refResult = await pool.query(
      `SELECT nextval('sar_reference_seq') as seq`
    );
    const seq = refResult.rows[0].seq;
    const year = new Date().getFullYear();
    const referenceNumber = `SAR-${year}-${String(seq).padStart(6, '0')}`;

    const result = await pool.query(
      `INSERT INTO suspicious_activity_reports 
       (reference_number, user_id, transaction_id, status, reason, 
        priority, assigned_to, notes)
       VALUES ($1, $2, $3, 'OPEN', $4, 'MEDIUM', $5, $6)
       RETURNING *`,
      [
        referenceNumber,
        userId,
        transactionId || null,
        reason,
        officerId,
        JSON.stringify([{
          note: `SAR manually created. Reason: ${reason}`,
          by: officerId,
          at: new Date().toISOString(),
        }]),
      ]
    );

    logger.warn('Manual SAR created', { referenceNumber, userId, officerId });

    return this.mapRow(result.rows[0]);
  }

  /**
   * ADD NOTE TO SAR
   * Officers add investigation notes like "Contacted user, confirmed legit"
   */
  async addNote(sarId: string, note: string, officerId: string): Promise<SAR> {
    const newNote: SARNote = {
      note,
      by: officerId,
      at: new Date().toISOString(),
    };

    const result = await pool.query(
      `UPDATE suspicious_activity_reports 
       SET notes = notes || $1::jsonb,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [JSON.stringify([newNote]), sarId]
    );

    if (result.rows.length === 0) {
      throw new Error('SAR not found');
    }

    logger.info('Note added to SAR', { sarId, officerId });
    return this.mapRow(result.rows[0]);
  }

  /**
   * UPDATE STATUS
   * Move SAR through lifecycle: OPEN → UNDER_REVIEW → ESCALATED/RESOLVED/FILED
   */
  async updateStatus(
    sarId: string,
    newStatus: 'OPEN' | 'UNDER_REVIEW' | 'ESCALATED' | 'RESOLVED' | 'FILED',
    officerId: string,
    note?: string
  ): Promise<SAR> {
    const statusNote: SARNote = {
      note: note || `Status changed to ${newStatus}`,
      by: officerId,
      at: new Date().toISOString(),
    };

    // Set resolved_at or filed_at timestamps when applicable
    let extraFields = '';
    if (newStatus === 'RESOLVED') {
      extraFields = ', resolved_at = NOW()';
    } else if (newStatus === 'FILED') {
      extraFields = ', filed_at = NOW()';
    }

    const result = await pool.query(
      `UPDATE suspicious_activity_reports 
       SET status = $1,
           notes = notes || $2::jsonb,
           updated_at = NOW()
           ${extraFields}
       WHERE id = $3
       RETURNING *`,
      [newStatus, JSON.stringify([statusNote]), sarId]
    );

    if (result.rows.length === 0) {
      throw new Error('SAR not found');
    }

    logger.info('SAR status updated', { sarId, newStatus, officerId });
    return this.mapRow(result.rows[0]);
  }

  /**
   * ASSIGN SAR to a compliance officer
   */
  async assignTo(sarId: string, officerId: string, assignedBy: string): Promise<SAR> {
    const note: SARNote = {
      note: `Assigned to officer ${officerId}`,
      by: assignedBy,
      at: new Date().toISOString(),
    };

    const result = await pool.query(
      `UPDATE suspicious_activity_reports 
       SET assigned_to = $1,
           status = CASE WHEN status = 'OPEN' THEN 'UNDER_REVIEW' ELSE status END,
           notes = notes || $2::jsonb,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [officerId, JSON.stringify([note]), sarId]
    );

    if (result.rows.length === 0) {
      throw new Error('SAR not found');
    }

    logger.info('SAR assigned', { sarId, officerId, assignedBy });
    return this.mapRow(result.rows[0]);
  }

  /**
   * GET ALL SARs (with filters for compliance dashboard)
   */
  async list(filters?: {
    status?: string;
    priority?: string;
    userId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ sars: SAR[]; total: number }> {
    let whereClause = '';
    const params: any[] = [];
    const conditions: string[] = [];

    if (filters?.status) {
      params.push(filters.status);
      conditions.push(`status = $${params.length}`);
    }
    if (filters?.priority) {
      params.push(filters.priority);
      conditions.push(`priority = $${params.length}`);
    }
    if (filters?.userId) {
      params.push(filters.userId);
      conditions.push(`user_id = $${params.length}`);
    }

    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM suspicious_activity_reports ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated results
    const limit = filters?.limit || 20;
    const offset = filters?.offset || 0;
    params.push(limit);
    params.push(offset);

    const result = await pool.query(
      `SELECT * FROM suspicious_activity_reports 
       ${whereClause}
       ORDER BY 
         CASE priority 
           WHEN 'CRITICAL' THEN 1 
           WHEN 'HIGH' THEN 2 
           WHEN 'MEDIUM' THEN 3 
           WHEN 'LOW' THEN 4 
         END,
         created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return {
      sars: result.rows.map(row => this.mapRow(row)),
      total,
    };
  }

  /**
   * GET SINGLE SAR by ID
   */
  async getById(sarId: string): Promise<SAR | null> {
    const result = await pool.query(
      `SELECT * FROM suspicious_activity_reports WHERE id = $1`,
      [sarId]
    );

    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  /**
   * MAP database row to our SAR type
   * Converts snake_case columns to camelCase
   */
  private mapRow(row: any): SAR {
    return {
      id: row.id,
      referenceNumber: row.reference_number,
      userId: row.user_id,
      transactionId: row.transaction_id,
      status: row.status,
      reason: row.reason,
      fraudScore: row.fraud_score,
      triggeredRules: row.triggered_rules || [],
      notes: row.notes || [],
      priority: row.priority,
      assignedTo: row.assigned_to,
      createdAt: row.created_at,
    };
  }
}

export default new SARService();