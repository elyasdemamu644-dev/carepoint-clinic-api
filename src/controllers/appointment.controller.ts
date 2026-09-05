import type { Request, Response } from 'express';
import {
  createAppointment,
  deleteAppointment,
  getAppointmentById,
  getOverviewStats,
  listAppointments,
  updateAppointment,
} from '../services/appointment.service.js';
import type {
  CreateAppointmentInput,
  ListAppointmentsQuery,
  UpdateAppointmentInput,
} from '../schemas/appointment.schema.js';

type ValidatedCreate = { body: CreateAppointmentInput };
type ValidatedUpdate = { body: UpdateAppointmentInput; params: { id: string } };
type ValidatedList = { query: ListAppointmentsQuery };
type ValidatedId = { params: { id: string } };

export function createAppointmentController(_req: Request, res: Response): void {
  const validated = res.locals.validated as ValidatedCreate;
  const appointment = createAppointment(validated.body);
  res.status(201).json({ status: 'success', data: appointment });
}

export function listAppointmentsController(_req: Request, res: Response): void {
  const validated = res.locals.validated as ValidatedList;
  const appointments = listAppointments(validated.query);
  res.status(200).json({ status: 'success', count: appointments.length, data: appointments });
}

export function getAppointmentController(req: Request, res: Response): void {
  const validated = res.locals.validated as ValidatedId;
  const appointment = getAppointmentById(validated.params.id);
  res.status(200).json({ status: 'success', data: appointment });
}

export function updateAppointmentController(req: Request, res: Response): void {
  const validated = res.locals.validated as ValidatedUpdate;
  const appointment = updateAppointment(validated.params.id, validated.body);
  res.status(200).json({ status: 'success', data: appointment });
}

export function deleteAppointmentController(req: Request, res: Response): void {
  const validated = res.locals.validated as ValidatedId;
  deleteAppointment(validated.params.id);
  res.status(204).send();
}

export function overviewController(_req: Request, res: Response): void {
  res.status(200).json({ status: 'success', data: getOverviewStats() });
}
