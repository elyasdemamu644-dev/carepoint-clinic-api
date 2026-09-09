import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export function requireAppointmentOwnership(options: { allowReadAllOverride?: boolean } = {}) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ status: 'error', message: 'Authentication required' });
        return;
      }

      const appointmentId = req.params.id;
      if (typeof appointmentId !== 'string') {
        res.status(400).json({ status: 'error', message: 'Appointment ID is required' });
        return;
      }

      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: { id: true, patientId: true }
      });

      if (!appointment) {
        res.status(404).json({ status: 'error', message: 'Appointment not found' });
        return;
      }

      const isOwner = appointment.patientId === req.user.userId;
      const hasOverride = options.allowReadAllOverride === true && req.user.permissions.includes('appointments:read_all');

      if (!isOwner && !hasOverride) {
        res.status(403).json({ status: 'error', message: 'Forbidden: you do not own this appointment' });
        return;
      }

      next();
    } catch (error: unknown) {
      next(error);
    }
  };
}
