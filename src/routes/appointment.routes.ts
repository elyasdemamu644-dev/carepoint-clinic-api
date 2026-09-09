import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requireAnyPermission, requirePermission } from '../middlewares/permission.middleware.js';
import { requireAppointmentOwnership } from '../middlewares/ownership.middleware.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import { AppointmentIdSchema, CreateAppointmentSchema, ListAppointmentsSchema, UpdateAppointmentSchema, UpdateStatusSchema } from '../schemas/appointment.schema.js';
import { createAppointmentController, deleteAppointmentController, getAppointmentController, listAppointmentsController, updateAppointmentController, updateStatusController } from '../controllers/appointment.controller.js';

export const appointmentRouter = Router();

appointmentRouter.use(requireAuth);

appointmentRouter.post('/', requirePermission('appointments:create'), validateRequest(CreateAppointmentSchema), createAppointmentController);
appointmentRouter.get('/', validateRequest(ListAppointmentsSchema), listAppointmentsController);
appointmentRouter.get('/:id', validateRequest(AppointmentIdSchema), requireAnyPermission('appointments:read_own', 'appointments:read_all'), requireAppointmentOwnership({ allowReadAllOverride: true }), getAppointmentController);
appointmentRouter.patch('/:id', validateRequest(AppointmentIdSchema), requirePermission('appointments:update_own'), requireAppointmentOwnership(), validateRequest(UpdateAppointmentSchema), updateAppointmentController);
appointmentRouter.patch('/:id/status', validateRequest(AppointmentIdSchema), requirePermission('appointments:manage_status'), validateRequest(UpdateStatusSchema), updateStatusController);
appointmentRouter.delete('/:id', validateRequest(AppointmentIdSchema), requirePermission('appointments:delete_own'), requireAppointmentOwnership(), deleteAppointmentController);
