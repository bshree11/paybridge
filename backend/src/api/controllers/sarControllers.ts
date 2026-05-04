import { Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth";
import SARService from "../../services/SARService";

class SARController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { status, priority, userId, limit, offset } = req.query;

      const result = await SARService.list({
        status: status as string,
        priority: priority as string,
        userId: userId as string,
        limit: limit ? parseInt(limit as string, 10) : 20,
        offset: offset ? parseInt(offset as string, 10) : 0,
      });

      res.json({
        success: true,
        data: result.sars,
        pagination: {
          total: result.total,
          limit: limit ? parseInt(limit as string, 10) : 20,
          offset: offset ? parseInt(offset as string, 10) : 0,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const sar = await SARService.getById(String(req.params.id));

      if (!sar) {
        return res.status(404).json({
          success: false,
          error: "SAR not found",
        });
      }

      res.json({ success: true, data: sar });
    } catch (error) {
      next(error);
    }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { userId, reason, transactionId } = req.body;
      const officerId = String(req.user!.userId);

      if (!userId || !reason) {
        return res.status(400).json({
          success: false,
          error: "userId and reason are required",
        });
      }

      const sar = await SARService.createManual(
        userId,
        reason,
        officerId,
        transactionId,
      );

      res.status(201).json({ success: true, data: sar });
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { status, note } = req.body;
      const officerId = String(req.user!.userId);

      const validStatuses = [
        "OPEN",
        "UNDER_REVIEW",
        "ESCALATED",
        "RESOLVED",
        "FILED",
      ];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        });
      }

      const sar = await SARService.updateStatus(
        String(req.params.id),

        status,
        officerId,
        note,
      );

      res.json({ success: true, data: sar });
    } catch (error) {
      next(error);
    }
  }

  async addNote(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { note } = req.body;
      const officerId = String(req.user!.userId);

      if (!note) {
        return res.status(400).json({
          success: false,
          error: "note is required",
        });
      }

      const sar = await SARService.addNote(
        String(req.params.id),
        note,
        officerId,
      );

      res.json({ success: true, data: sar });
    } catch (error) {
      next(error);
    }
  }

  async assign(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { officerId } = req.body;
      const assignedBy = String(req.user!.userId);

      if (!officerId) {
        return res.status(400).json({
          success: false,
          error: "officerId is required",
        });
      }

      const sar = await SARService.assignTo(
        String(req.params.id),
        officerId,
        assignedBy,
      );

      res.json({ success: true, data: sar });
    } catch (error) {
      next(error);
    }
  }
}

export default new SARController();
