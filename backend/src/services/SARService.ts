// PURPOSE: Manages Suspicious Activity Reports (SARs)
// Auto-creates SAR when fraud score > 70
// Compliance officers can add notes, escalate, resolve, or file SARs

import { pool } from "../config/database";
import { logger } from "../utils/logger";
import { FraudCheckResult } from "./FraudDetectionService";

// Types

export interface SARNote {
  note: string;
  by: string; // officer's user ID
  at: string; // ISO timestamp
}

export interface SAR {
  id: string;
  referenceNumber: string;
  userId: string;
  transactionId?: string;
  status: "OPEN" | "UNDER_REVIEW" | "ESCALATED" | "RESOLVED" | "FILED";
  reason: string;
  fraudScore?: number;
  triggeredRules: any[];
  notes: SARNote[];
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
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
    transactionId?: string,
  ): Promise<any> {
    const reason =
      `Auto-generated: Fraud score ${fraudResult.totalScore}/100. ` +
      `Triggered rules: ${fraudResult.rules
        .filter((r) => r.triggered)
        .map((r) => r.rule)
        .join(", ")}`;

    const result = await pool.query(
      `INSERT INTO sar_reports 
     (transaction_id, status, notes)
     VALUES ($1, 'open', $2)
     RETURNING *`,
      [
        transactionId || null,
        JSON.stringify([
          {
            note: reason,
            by: "SYSTEM",
            at: new Date().toISOString(),
          },
        ]),
      ],
    );

    logger.warn("SAR created", {
      sarId: result.rows[0].id,
      transactionId,
      fraudScore: fraudResult.totalScore,
    });

    return result.rows[0];
  }

  /**
   * MANUAL CREATE SAR
   * Compliance officers can create SARs manually
   */
  async createManual(
    transactionId: string,
    reason: string,
    officerId: string,
  ): Promise<any> {
    const result = await pool.query(
      `INSERT INTO sar_reports 
     (transaction_id, assigned_to, status, notes)
     VALUES ($1, $2, 'open', $3)
     RETURNING *`,
      [
        transactionId,
        parseInt(officerId, 10),
        JSON.stringify([
          {
            note: `SAR manually created. Reason: ${reason}`,
            by: officerId,
            at: new Date().toISOString(),
          },
        ]),
      ],
    );

    return result.rows[0];
  }

  /**
   * ADD NOTE TO SAR
   * Officers add investigation notes like "Contacted user, confirmed legit"
   */
  async addNote(sarId: string, note: string, officerId: string): Promise<any> {
    const newNote = {
      note,
      by: officerId,
      at: new Date().toISOString(),
    };

    const result = await pool.query(
      `UPDATE sar_reports 
     SET notes = notes || $1::jsonb
     WHERE id = $2
     RETURNING *`,
      [JSON.stringify([newNote]), sarId],
    );

    if (result.rows.length === 0) throw new Error("SAR not found");
    return result.rows[0];
  }

  /**
   * UPDATE STATUS
   * Move SAR through lifecycle: OPEN → UNDER_REVIEW → ESCALATED/RESOLVED/FILED
   */
  async updateStatus(
    sarId: string,
    newStatus: string,
    officerId: string,
    note?: string,
  ): Promise<any> {
    const statusNote = {
      note: note || `Status changed to ${newStatus}`,
      by: officerId,
      at: new Date().toISOString(),
    };

    let extraFields = "";
    if (newStatus === "resolved") {
      extraFields = ", resolved_at = NOW()";
    }

    const result = await pool.query(
      `UPDATE sar_reports 
     SET status = $1,
         notes = notes || $2::jsonb
         ${extraFields}
     WHERE id = $3
     RETURNING *`,
      [newStatus, JSON.stringify([statusNote]), sarId],
    );

    if (result.rows.length === 0) throw new Error("SAR not found");
    return result.rows[0];
  }

  /**
   * ASSIGN SAR to a compliance officer
   */
  async assignTo(
    sarId: string,
    officerId: string,
    assignedBy: string,
  ): Promise<any> {
    const note = {
      note: `Assigned to officer ${officerId}`,
      by: assignedBy,
      at: new Date().toISOString(),
    };

    const result = await pool.query(
      `UPDATE sar_reports 
     SET assigned_to = $1,
         notes = notes || $2::jsonb
     WHERE id = $3
     RETURNING *`,
      [parseInt(officerId, 10), JSON.stringify([note]), sarId],
    );

    if (result.rows.length === 0) throw new Error("SAR not found");
    return result.rows[0];
  }

  /**
   * GET ALL SARs (with filters for compliance dashboard)
   */
  async list(filters?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ sars: any[]; total: number }> {
    let whereClause = "";
    const params: any[] = [];

    if (filters?.status) {
      params.push(filters.status);
      whereClause = `WHERE status = $${params.length}`;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM sar_reports ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const limit = filters?.limit || 20;
    const offset = filters?.offset || 0;
    params.push(limit);
    params.push(offset);

    const result = await pool.query(
      `SELECT * FROM sar_reports 
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return { sars: result.rows, total };
  }

  /**
   * GET SINGLE SAR by ID
   */
  async getById(sarId: string): Promise<any | null> {
    const result = await pool.query(`SELECT * FROM sar_reports WHERE id = $1`, [
      sarId,
    ]);
    if (result.rows.length === 0) return null;
    return result.rows[0];
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
