import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import * as GDPRService from '../../services/GDPRService';

export async function exportData(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const data = await GDPRService.exportUserData(userId);

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function deleteAccount(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;

    // Check if already anonymized
    const alreadyDeleted = await GDPRService.isAnonymized(userId);
    if (alreadyDeleted) {
      return res.status(400).json({
        success: false,
        error: 'Account already deleted',
      });
    }

    await GDPRService.anonymizeAccount(userId);

    res.json({
      success: true,
      message: 'Account anonymized successfully. You will be logged out.',
    });
  } catch (error) {
    next(error);
  }
}

export async function getConsent(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const consent = await GDPRService.getConsentStatus(req.user!.userId);
    res.json({ success: true, data: consent });
  } catch (error) {
    next(error);
  }
}

export async function updateConsent(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { dataProcessing, marketing, analytics } = req.body;
    await GDPRService.updateConsent(
      req.user!.userId,
      dataProcessing,
      marketing,
      analytics
    );

    res.json({ success: true, message: 'Consent preferences updated' });
  } catch (error) {
    next(error);
  }
}