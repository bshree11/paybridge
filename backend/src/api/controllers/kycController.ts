import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth";
import * as kycService from "../../services/KYCService";

export async function submitKYC(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.userId as number;
    const { documentUrl, documentType } = req.body;
    const ipAddress = String(req.ip || "");

    const result = await kycService.submitKYC(
      userId,
      documentUrl,
      documentType,
      ipAddress,
    );
    res.status(201).json({ kycRecord: result });
  } catch (error) {
    next(error);
  }
}

export async function getStatus(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.user?.userId as number;
    const result = await kycService.getKYCStatus(userId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getKYCQueue(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const queue = await kycService.getPendingKYCQueue();
    res.status(200).json({ queue });
  } catch (error) {
    next(error);
  }
}

export async function approveKYC(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const kycId = Number(req.params?.id);
    const officerId = req.user?.userId as number;
    const ipAddress = String(req.ip || "");
    const result = await kycService.approveKYC(kycId, officerId, ipAddress);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function rejectKYC(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const kycId = Number(req.params?.id);
    const officerId = req.user?.userId as number;
    const { reason } = req.body;
    const ipAddress = String(req.ip || "");

    const result = await kycService.rejectKYC(
      kycId,
      officerId,
      reason,
      ipAddress,
    );

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
