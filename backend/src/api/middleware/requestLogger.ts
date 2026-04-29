import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';

//when the response is done being sent to user log it  - useful to check which endpoints are slow 

export function requestLogger(
    req: Request,
    res: Response,
    next: NextFunction
){
    const start = Date.now();

    res.on('finish', ()=>{
        const duration = Date.now() -start;
        logger.info(
            `${req.method} ${req.path} ${res.statusCode} - ${duration}ms`
        );
    });
    next();
}