import { Response, NextFunction } from 'express';
import { AuthRequest} from '../middleware/auth';
import * as paymentService from '../../services/PaymentService';

export async function createPayment(
    req: AuthRequest,
    res: Response,
    next: NextFunction
){
    try{
        const userId = req.user?.userId as number;
        const { amount, currency, cardToken, idempotencyKey} = req.body;
        const ipAddress = String(req.ip || '');
        
        const result = await paymentService.createPayment(
            userId, amount, currency, cardToken, idempotencyKey, ipAddress
        );
        res.status(201).json(result);
    }catch(error){
        next(error);
    }
}

export async function getPayment(
    req: AuthRequest,
    res: Response,
    next: NextFunction
){
    try{
        const userId = req.user?.userId as number;
        const transactionId = String(req.params.id);
        const result = await paymentService.getPayment(
            transactionId, userId
        );
        res.status(200).json(result);
    }catch(error){
        next(error);
    }
}

export async function getUserPayments(
    req: AuthRequest,
    res: Response,
    next: NextFunction
){
    try{
        const userId = req.user?.userId as number;
        const result = await paymentService.getUserPayments(userId);
        res.status(200).json({ payments: result });
    }catch(error){
        next(error);
    }
}