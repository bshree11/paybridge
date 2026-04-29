import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/environment';
import { redis } from '../../config/redis';
import { AuthError } from '../../utils/errors';

export interface AuthRequest extends Request{
    user?: {
        userId: number;
        email: string;
        role: string;
        jti: string;
    };
}

export async function authMiddleware(
    req: AuthRequest,
    res: Response,
    next: NextFunction
){
     const authHeader = req.headers.authorization;

     if(!authHeader || !authHeader.startsWith('Bearer')){
        throw new AuthError('No token provided');
     }

     const token = authHeader.split(' ')[1];

     try{
        const decoded = jwt.verify(
            token, env.JWT_SECRET
        ) as any;

        const isBlocked = await redis.get(
            `blocked:${decoded.jti}`
        );
        if(isBlocked){
            throw new AuthError('Token has been revoked');
        }
        req.user ={
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role,
            jti: decoded.jti,
        };
        next();
     }catch(error){
        if(error instanceof AuthError){
            throw error;
        }
        throw new AuthError('Invalid token');
     }
}