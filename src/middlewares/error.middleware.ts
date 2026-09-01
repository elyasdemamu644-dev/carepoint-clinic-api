import type { ErrorRequestHandler, Request, Response, NextFunction } from 'express';
import {
  AppointmentCollisionError,
  AppointmentNotFoundError,
} from '../services/appointment.service.js';

export const notFoundMiddleware = (req: Request, res: Response): void => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
};

export const errorMiddleware: ErrorRequestHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (error instanceof AppointmentNotFoundError) {
    res.status(404).json({ status: 'error', message: error.message });
    return;
  }
  if (error instanceof AppointmentCollisionError) {
    res.status(409).json({ status: 'error', message: error.message });
    return;
  }
  console.error(error);
  res.status(500).json({ status: 'error', message: 'Internal server error' });
};
