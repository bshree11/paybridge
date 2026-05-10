import { response } from 'express';
import { query } from '../config/database';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';

export async function checkIdempotency(
    key: string,
    userId: number
) {
    const cached = await redis.get(`idem:${key}`);
    if(cached){
        logger.info('Idempotency hit (Redis)', { key });
        return JSON.parse(cached);
    }

    //Check PostgreSQL
    const result = await query(
        `SELECT response_cache FROM idempotency_keys
        WHERE key = $1 AND user_id = $2`,
        [key, userId]
    );

    if(result.rows.length >0){
        //Found in DB, cache in redis for next time 
        const response = result.rows[0].response_cache;
        await redis.setex(
            `idem:${key}`, 86400, JSON.stringify(response)
        );
        logger.info('Idempotency hit (DB)', { key });
        return response;
    }

    //no match - this is new request
    return null;
}


export async function saveIdempotency(
    key: string,
    userId: number,
    transactionId: string,
    response: any
) {
    const expiresAt = new Date(
        Date.now() + 24 * 60 * 60 * 1000
    );

    await query(
        `INSERT INTO idempotency_keys
    (key, user_id, transaction_id)
    VALUES ($1, $2, $3, $4, $5)`,
    [key, userId, transactionId, JSON.stringify(response), expiresAt]
    );
    
    //also cache in redis (24 hour ttl)
    await redis.setex(
        `idem: ${key}`, 86400, JSON.stringify(response)
    );
    logger.info('Idempotency key saved', { key });
}