import { z } from 'zod';

export const DepartmentEnum = z.enum([
  'GENERAL_PRACTICE',
  'DENTISTRY',
  'CARDIOLOGY',
  'DERMATOLOGY',
  'PEDIATRICS'
]);

export const AppointmentStatusEnum = z.enum([
  'PENDING',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED'
]);

const futureClinicDate = z.string()
  .datetime({ message: 'Must be a valid ISO-8601 datetime string' })
  .refine((value) => new Date(value).getTime() > Date.now(), {
    message: 'Appointment date must be in the future'
  })
  .refine((value) => {
    const date = new Date(value);
    const hour = date.getUTCHours();
    return hour >= 8 && hour < 17;
  }, {
    message: 'Appointments must be scheduled during clinic hours (08:00 - 17:00 UTC)'
  });

const symptomsSchema = z.string().trim().min(10).max(1000);

export const CreateAppointmentSchema = z.object({
  body: z.object({
    department: DepartmentEnum,
    appointmentDate: futureClinicDate,
    symptoms: symptomsSchema,
    isEmergency: z.boolean().default(false)
  }).strict()
});

export const UpdateAppointmentSchema = z.object({
  body: z.object({
    appointmentDate: futureClinicDate.optional(),
    symptoms: symptomsSchema.optional()
  }).strict().refine((body) => Object.keys(body).length > 0, {
    message: 'At least one editable field is required'
  })
});

export const UpdateStatusSchema = z.object({
  body: z.object({
    status: AppointmentStatusEnum
  }).strict()
});

export const AppointmentIdSchema = z.object({
  params: z.object({ id: z.string().uuid('Appointment ID must be a valid UUID') }).strict()
});

export const GoogleCallbackSchema = z.object({
  query: z.object({
    code: z.string().min(1).optional(),
    state: z.string().min(1).optional(),
    error: z.string().optional()
  }).strict()
});

export const ListAppointmentsSchema = z.object({
  query: z.object({
    department: DepartmentEnum.optional(),
    status: AppointmentStatusEnum.optional(),
    isEmergency: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
    search: z.string().trim().min(1).max(100).optional()
  }).strict()
});

export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>['body'];
export type UpdateAppointmentInput = z.infer<typeof UpdateAppointmentSchema>['body'];
export type UpdateStatusInput = z.infer<typeof UpdateStatusSchema>['body'];
export type ListAppointmentsInput = z.infer<typeof ListAppointmentsSchema>['query'];
