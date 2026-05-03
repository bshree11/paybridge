import { query } from '../config/database';
import { logger } from '../utils/logger';

export interface VelocityResult{
    passed: boolean;
    reason?: string;
    details?: any;
}

export async function checkVelocity(
    userId: number,
    amount: number
): Promise<VelocityResult> {

    //Rule 1 : Max 5 transactions in 10 mins
    const recentTx = await query(
        `SELECT COUNT(*) as count
        FROM transactions
        WHERE user_id = $1
        AND created_at > NOW() - Interval '10 minutes'`,
        [userId]
    );

    const txCount = parseInt(recentTx.rows[0].count);
    if(txCount >= 5){
        logger.warn('Velocity limit : too many transactions', 
            { userId, txCount }
        );
        return {
            passed: false,
            reason: 'Transaction amount exceeds limit',
            details: {amount, limit: 10000},
        };
    }

    //Rule 3: check if amount is 10x user's average
    const avgResult = await query(
        `SELECT AVG(amount) as avg_amount 
        FROM transactions
        WHERE user_id = $1
        AND status = 'confirmed`,
        [userId]
    );

    const avgAmount  = parseFloat(
        avgResult.rows[0].avg_amount || '0'
    );
    if(avgAmount >0 && amount > avgAmount * 10){
        logger.warn('Velocity limit: unusual amount',
            { userId, amount, avgAmount}
        );
        return {
            passed: false,
            reason: 'Amount unusually high compared to history',
            details: { amount, avgAmount },
        };
    }
    return { passed: true};
}