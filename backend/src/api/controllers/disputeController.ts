import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as DisputeService from '../../services/DisputeService';

export async function raise(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { transactionId, reason } = req.body;

    if (!transactionId || !reason) {
      return res.status(400).json({
        success: false,
        error: 'transactionId and reason are required',
      });
    }

    const dispute = await DisputeService.raiseDispute(userId, transactionId, reason);
    res.status(201).json({ success: true, data: dispute });
  } catch (error) {
    next(error);
  }
}

export async function merchantRespond(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const merchantId = req.user!.userId;
    const { response } = req.body;

    if (!response) {
      return res.status(400).json({
        success: false,
        error: 'response is required',
      });
    }

    const dispute = await DisputeService.merchantRespond(
      String(req.params.id),
      merchantId,
      response
    );
    res.json({ success: true, data: dispute });
  } catch (error) {
    next(error);
  }
}

export async function resolveRefund(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const officerId = req.user!.userId;
    const { resolution } = req.body;

    const dispute = await DisputeService.resolveWithRefund(
      String(req.params.id),
      officerId,
      resolution || 'Refund approved'
    );
    res.json({ success: true, data: dispute });
  } catch (error) {
    next(error);
  }
}

export async function resolveReject(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const officerId = req.user!.userId;
    const { resolution } = req.body;

    const dispute = await DisputeService.resolveRejected(
      String(req.params.id),
      officerId,
      resolution || 'Dispute rejected'
    );
    res.json({ success: true, data: dispute });
  } catch (error) {
    next(error);
  }
}

export async function getUserDisputes(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { limit, offset } = req.query;
    const result = await DisputeService.getUserDisputes(
      req.user!.userId,
      limit ? parseInt(limit as string, 10) : 20,
      offset ? parseInt(offset as string, 10) : 0
    );
    res.json({ success: true, data: result.disputes, total: result.total });
  } catch (error) {
    next(error);
  }
}

export async function getAllDisputes(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { status, limit, offset } = req.query;
    const result = await DisputeService.getAllDisputes(
      status as string,
      limit ? parseInt(limit as string, 10) : 20,
      offset ? parseInt(offset as string, 10) : 0
    );
    res.json({ success: true, data: result.disputes, total: result.total });
  } catch (error) {
    next(error);
  }
}

export async function getById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const dispute = await DisputeService.getDisputeById(String(req.params.id));
    if (!dispute) {
      return res.status(404).json({ success: false, error: 'Dispute not found' });
    }
    res.json({ success: true, data: dispute });
  } catch (error) {
    next(error);
  }
}