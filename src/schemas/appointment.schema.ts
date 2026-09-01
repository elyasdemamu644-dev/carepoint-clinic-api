import { z } from 'zod';

export const DepartmentEnum = z.enum([
  'GENERAL_PRACTICE',
  'DENTISTRY',
  'CARDIOLOGY',
  'DERMATOLOGY',
  'PEDIATRICS',
]);

const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9]{10,14}$/, 'Invalid phone number format (10-14 digits)');

const appointmentDateSchema = z
  .string({ required_error: 'Appointment datetime is required' })
  .datetime({ message: 'Must be a valid ISO-8601 datetime string' })
  .refine((value) => new Date(value).getTime() > Date.now(), {
    message: 'Appointment date must be in the future',
  })
  .refine(
    (value) => {
      const hour = new Date(value).getUTCHours();
      return hour >= 8 && hour < 17;
    },
    { message: 'Appointments must be scheduled during clinic hours (08:00 - 17:00 UTC)' },
  );

export const AppointmentFieldsSchema = z.object({
  patientName: z
    .string({ required_error: 'Patient name is required' })
    .trim()
    .min(3, 'Name must have at least 3 characters')
    .max(60, 'Name must not exceed 60 characters'),
  patientEmail: z
    .string({ required_error: 'Patient email is required' })
    .trim()
    .email('Invalid email address format')
    .toLowerCase(),
  patientPhone: phoneSchema,
  department: DepartmentEnum,
  appointmentDate: appointmentDateSchema,
  isEmergency: z.boolean().default(false),
  symptoms: z
    .string({ required_error: 'Symptoms description is required' })
    .trim()
    .min(10, 'Please provide at least 10 characters describing symptoms'),
}).strict();

export const CreateAppointmentSchema = z.object({
  body: AppointmentFieldsSchema,
  query: z.record(z.unknown()).optional(),
  params: z.record(z.unknown()).optional(),
});

export const UpdateAppointmentSchema = z.object({
  body: AppointmentFieldsSchema.partial().refine((body) => Object.keys(body).length > 0, {
    message: 'At least one editable field is required',
    path: [],
  }),
  query: z.record(z.unknown()).optional(),
  params: z.record(z.unknown()).optional(),
});

export const AppointmentIdSchema = z.object({
  params: z.object({
    id: z.string().trim().min(1, 'Appointment ID is required'),
  }),
  body: z.record(z.unknown()).optional(),
  query: z.record(z.unknown()).optional(),
});

export const ListAppointmentsSchema = z.object({
  query: z.object({
    department: DepartmentEnum.optional(),
    search: z.string().trim().optional(),
    isEmergency: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),
  }),
  body: z.record(z.unknown()).optional(),
  params: z.record(z.unknown()).optional(),
});

export type CreateAppointmentInput = z.infer<typeof AppointmentFieldsSchema>;
export type UpdateAppointmentInput = z.infer<typeof AppointmentFieldsSchema>;
export type Department = z.infer<typeof DepartmentEnum>;
export type ListAppointmentsQuery = z.infer<typeof ListAppointmentsSchema>['query'];
