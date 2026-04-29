import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { redis } from '../../config/redis';
import { RateLimitError } from '../../utils/errors';

export function rateLimit(
    maxRequests: number,
    windowSeconds: number
){
    return async(
        req: AuthRequest,
        res: Response,
        next: NextFunction
    )=>{
        const identifier = req.user?.userId || req.ip || 'unknown';
        const key = `rl:${req.path}:${identifier}`;

        const current = await redis.incr(key);

        if(current === 1){
            await redis.expire(key, windowSeconds);
        }
        if(current > maxRequests){
            throw new RateLimitError(
                `Too many requests. Try again later.`
            );
        }
        next();
    };
}