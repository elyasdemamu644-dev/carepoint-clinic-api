import type { NextFunction, Request, Response } from 'express';
import type { CreateAppointmentInput, ListAppointmentsInput, UpdateAppointmentInput, UpdateStatusInput } from '../schemas/appointment.schema.js';
import * as service from '../services/appointment.service.js';

export async function createAppointmentController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = res.locals.validated.body as CreateAppointmentInput;
    const appointment = await service.createAppointment(req.user!.userId, input);
    res.status(201).json({ status: 'success', data: appointment });
  } catch (error: unknown) { next(error); }
}

export async function listAppointmentsController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = res.locals.validated.query as ListAppointmentsInput;
    const canReadAll = req.user!.permissions.includes('appointments:read_all');
    const appointments = await service.listAppointments(req.user!.userId, canReadAll, filters);
    res.status(200).json({ status: 'success', count: appointments.length, data: appointments });
  } catch (error: unknown) { next(error); }
}

export async function getAppointmentController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const appointmentId = req.params.id;
    if (typeof appointmentId !== 'string') {
      res.status(400).json({ status: 'error', message: 'Appointment ID is required' });
      return;
    }

    const appointment = await service.getAppointment(appointmentId);
    res.status(200).json({ status: 'success', data: appointment });
  } catch (error: unknown) { next(error); }
}

export async function updateAppointmentController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const appointmentId = req.params.id;
    if (typeof appointmentId !== 'string') {
      res.status(400).json({ status: 'error', message: 'Appointment ID is required' });
      return;
    }

    const input = res.locals.validated.body as UpdateAppointmentInput;
    const appointment = await service.updateOwnAppointment(appointmentId, req.user!.userId, input);
    res.status(200).json({ status: 'success', data: appointment });
  } catch (error: unknown) { next(error); }
}

export async function updateStatusController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const appointmentId = req.params.id;
    if (typeof appointmentId !== 'string') {
      res.status(400).json({ status: 'error', message: 'Appointment ID is required' });
      return;
    }

    const input = res.locals.validated.body as UpdateStatusInput;
    const appointment = await service.updateStatus(appointmentId, input);
    res.status(200).json({ status: 'success', data: appointment });
  } catch (error: unknown) { next(error); }
}

export async function deleteAppointmentController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const appointmentId = req.params.id;
    if (typeof appointmentId !== 'string') {
      res.status(400).json({ status: 'error', message: 'Appointment ID is required' });
      return;
    }

    await service.deleteOwnAppointment(appointmentId, req.user!.userId);
    res.status(204).send();
  } catch (error: unknown) { next(error); }
}
