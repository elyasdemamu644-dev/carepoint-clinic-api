import { Router } from 'express';
import {
  createAppointmentController,
  deleteAppointmentController,
  getAppointmentController,
  listAppointmentsController,
  overviewController,
  updateAppointmentController,
} from '../controllers/appointment.controller.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import {
  AppointmentIdSchema,
  CreateAppointmentSchema,
  ListAppointmentsSchema,
  UpdateAppointmentSchema,
} from '../schemas/appointment.schema.js';

const router = Router();

router.get('/stats/overview', overviewController);
router.post('/', validateRequest(CreateAppointmentSchema), createAppointmentController);
router.get('/', validateRequest(ListAppointmentsSchema), listAppointmentsController);
router.get('/:id', validateRequest(AppointmentIdSchema), getAppointmentController);
router.patch('/:id', validateRequest(UpdateAppointmentSchema), updateAppointmentController);
router.delete('/:id', validateRequest(AppointmentIdSchema), deleteAppointmentController);

export default router;
