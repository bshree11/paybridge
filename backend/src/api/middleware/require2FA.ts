import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { ForbiddenError } from '../../utils/errors';
import { query } from '../../config/database';

export async function require2FA(
    req: AuthRequest,
    res: Response,
    next: NextFunction
){
    if(!req.user){
        throw new ForbiddenError('Not authenticated');
    }

    const result = await query(
        'SELECT totp_enabled FROM users WHERE id=$1',
        [req.user.userId]
    );

    const user = result.rows[0];

    if(!user.totp_enabled){
        throw new ForbiddenError(
            '2FA must be enabled for this action'
        );
    }
    next();
}