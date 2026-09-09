import type { NextFunction, Request, Response } from 'express';
import { getAdminMetrics } from '../services/appointment.service.js';

export async function metricsController(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const metrics = await getAdminMetrics();
    res.status(200).json({ status: 'success', data: metrics });
  } catch (error: unknown) { next(error); }
}
