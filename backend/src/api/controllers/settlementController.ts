import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as SettlementService from '../../services/SettlementService';

export async function runSettlement(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const summary = await SettlementService.runSettlement();
    res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
}

export async function completeSettlement(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const adminId = req.user!.userId;
    const settlement = await SettlementService.completeSettlement(
      String(req.params.id),
      adminId
    );
    res.json({ success: true, data: settlement });
  } catch (error) {
    next(error);
  }
}

export async function getHistory(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { merchantId, limit, offset } = req.query;
    const result = await SettlementService.getSettlementHistory(
      merchantId as string,
      limit ? parseInt(limit as string, 10) : 20,
      offset ? parseInt(offset as string, 10) : 0
    );
    res.json({ success: true, data: result.settlements, total: result.total });
  } catch (error) {
    next(error);
  }
}

export async function getById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const settlement = await SettlementService.getSettlementById(String(req.params.id));
    if (!settlement) {
      return res.status(404).json({ success: false, error: 'Settlement not found' });
    }
    res.json({ success: true, data: settlement });
  } catch (error) {
    next(error);
  }
}