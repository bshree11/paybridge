import { Request, Response, NextFunction} from 'express';
import { AppError } from '../../utils/errors';
import { logger } from '../../utils/logger';

export const errorHandler =(
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
)=>{
    if(err instanceof AppError){
        res.status(err.statusCode).json({
            error: {
                code: err.code,
                message: err.message,
            },
        });
        return;
    }

    logger.error('Unexpected error: ', err);

    res.status(500).json({
        error:{
            code: 'INTERNAL_ERROR',
            message: 'Something went wrong',
        },
    });
};