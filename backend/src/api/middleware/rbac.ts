import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { ForbiddenError } from '../../utils/errors';

export function authorize(...roles: string[]){
    return(
        req: AuthRequest,
        res: Response,
        next: NextFunction
    )=>{
        if(!req.user){
            throw new ForbiddenError('Not authenticated');
        }

        if(!roles.includes(req.user.role)){
            throw new ForbiddenError('You do not have permission');
        }
        next();
    };
}