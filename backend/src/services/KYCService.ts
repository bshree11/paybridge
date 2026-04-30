import { query } from '../config/database';
import { logAudit } from './AuditLogger';
import { ValidationError, NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';

export async function submitKYC(
    userId: number,
    documentUrl: string,
    documentType: string,
    ipAddress: string

){
    const existing = await query(
        `SELECT id FROM kyc_records
        WHERE user_id = $1
        AND status = 'pending'`,
        [userId]
    );

    if(existing.rows.length>0){
        throw new ValidationError(
            'You already have a pending KYC submission'
        );
    }

    const result = await query(
        `INSERT INTO kyc_records
        (user_id, document_url, document_type)
        VALUES ($1, $2, $3)
        RETURNING  id, status`,
        [userId, documentUrl, documentType]
    );

    await query(
        `UPDATE users SET kyc_status = 'pending'
        WHERE id = $1`,
        [userId]
    );

    await logAudit(
        userId, 'user', 'kyc_submitted',
        'kyc_record', result.rows[0].id.toString(),
        { documentType },
        ipAddress
    );
    logger.info('KYC Submitted', {userId});
    return result.rows[0];
}

export async function getKYCStatus(userId: number){
    const result = await query(
        `SELECT id, document_type, status,
        rejection_reason, expires_at, created_at
        FROM kyc_records
        WHERE user_id =$1
        ORDER BY created_at DESC
        LIMIT 1`,
        [userId]
    );

    if(result.rows.length === 0){
        return { status: 'unverified', record: null}
    }
    return{
        status: result.rows[0].status,
        record: result.rows[0]
    };
}

export async function getPendingKYCQueue(){
    const result = await query(
        `SELECT kr.id, kr.user_id, kr.document_url,
        kr.document_type, kr.status, kr.created_at,
        u.email
        FROM kyc_records kr
        JOIN users u ON u.id = kr.user_id
        WHERE kr.status = 'pending'
        ORDER BY kr.created_at ASC`
    );
    return result.rows;
}

export async function approveKYC(
    kycId: number,
    officerId: number,
    ipAddress: string
){
    const record = await query(
        'SELECT id, user_id, status FROM kyc_records WHERE id = $1',
        [kycId]
    );

    if(record.rows.length === 0){
        throw new NotFoundError('KYC record not found');
    }

    if(record.rows[0].status !== 'pending'){
        throw new ValidationError(
            'Can only approve pending KYC records'
        );
    }


    const expiresAt = new Date(
        Date.now() + 365 *24* 60* 60*1000
    );

    await query(
        `UPDATE kyc_records
        SET status = 'verified',
        reviewed_by = $1,
        reviewed_at = NOW(),
        expires_at = $2
        WHERE id = $3`,
        [officerId, expiresAt, kycId]

    );

    await query(
        `UPDATE users SET kyc_status = 'verified'
        WHERE id = $1`,
        [record.rows[0].user_id]
    );

    await logAudit(
        officerId, 'compliance_officer',
        'kyc_approved',
        'kyc_record', kycId.toString(),
        { userId: record.rows[0].user_id},
        ipAddress
    );

    logger.info('KYC approved', {kycId, officerId});
    return { message: 'KYC approved'};
}

export async function rejectKYC(
    kycId: number,
    officerId: number,
    reason: string,
    ipAddress: string
) {
    const record = await query(
        'SELECT id, user_id, status FROM kyc_records WHERE id = $1',
        [kycId]
    );

    if(record.rows.length === 0){
        throw new NotFoundError('KYC record not found');
    }

    if(record.rows[0].status !=='pending'){
        throw new ValidationError('Can only reject pending KYC records');
    }

    await query(
        `UPDATE kyc_records
        SET status = 'rejected'
        reviewed_by = $1,
        reviewed_at = NOW(),
        rejection_reason = $2
        WHERE id = $3
        `,
        [officerId, reason, kycId]
        
    );

    await query(
        `UPDATE users SET kyc_status = 'rejected'
        WHERE id = $1`,
        [record.rows[0].user_id]
    );

    await logAudit(
        officerId, 'compliance officer',
        'kyc_rejected',
        'kyc_record', kycId.toString(),
        {userId: record.rows[0].user_id, reason},
        ipAddress
    );
    logger.info("KYC rejected", {kycId, officerId});
    return {message: 'KYC rejected'};
}