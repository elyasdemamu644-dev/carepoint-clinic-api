import type { CreateAppointmentInput, UpdateAppointmentInput } from '../schemas/appointment.schema.js';

declare global {
  namespace Express {
    interface Request {
      validatedBody?: CreateAppointmentInput | UpdateAppointmentInput;
    }
  }
}

export {};
