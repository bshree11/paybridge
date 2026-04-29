import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';

// masking user data in log files and sending original data to user ONLY

export function piiMasking(
    req: Request,
    res: Response,
    next: NextFunction
){
    const originalJson = res.json.bind(res);
    res.json = (body: any) =>{
        const masked = maskPII(
            JSON.stringify(body)
        );
        logger.debug('Response:', masked);
        return originalJson(body);
    };
    next();
}
function maskPII(text: string) : string{
    return text.replace(                     //  for email
        /\b[\w.-]+@[\w.-]+\.\w+\b/g,
        '***@***.***'
    )
    .replace(                              // for card number
        /\b\d{13,19}\b/g,
        '****-****-****-****'
    )
    .replace(                            // for phone number
        /\b\d{10,12}\b/g,
        '**********'
    );
}