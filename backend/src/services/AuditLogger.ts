import { query } from '../config/database';
import { logger } from '../utils/logger';

export async function logAudit(
    actorId: number| null,
    actorRole: string,
    action: string,
    entityType: string,
    entityId: string,
    metadata: any = {},
    ipAddress: string = ''

){
    await query(
        `INSERT INTO audit_logs
        (actor_id, actor_role, action,
        entity_type, entity_id,
        metadata, ip_address)
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
            actorId,
            actorRole,
            action,
            entityType,
            entityId,
            JSON.stringify(metadata),
            ipAddress
        ]
    );

    logger.info('Audit log created', {
        action, entityType, entityId
    });
}