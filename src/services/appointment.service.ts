import { AppointmentStatus, Prisma, type Department } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import type { CreateAppointmentInput, ListAppointmentsInput, UpdateAppointmentInput, UpdateStatusInput } from '../schemas/appointment.schema.js';

export class AppointmentNotFoundError extends Error { readonly statusCode = 404; }
export class AppointmentConflictError extends Error { readonly statusCode = 409; }
export class AppointmentRuleError extends Error { readonly statusCode = 400; }

const appointmentSelect = {
  id: true,
  patientId: true,
  department: true,
  appointmentDate: true,
  symptoms: true,
  isEmergency: true,
  status: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  patient: { select: { id: true, name: true, email: true, phone: true } }
} as const;

function utcHourRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setUTCMinutes(0, 0, 0);
  const end = new Date(start);
  end.setUTCHours(end.getUTCHours() + 1);
  return { start, end };
}

async function ensureNoCollision(department: Department, appointmentDate: Date, excludeId?: string): Promise<void> {
  const { start, end } = utcHourRange(appointmentDate);
  const collision = await prisma.appointment.findFirst({
    where: {
      department,
      appointmentDate: { gte: start, lt: end },
      status: { not: AppointmentStatus.CANCELLED },
      ...(excludeId ? { id: { not: excludeId } } : {})
    },
    select: { id: true }
  });
  if (collision) {
    throw new AppointmentConflictError('That department already has an active appointment in the requested UTC hour');
  }
}

export async function createAppointment(patientId: string, input: CreateAppointmentInput) {
  const appointmentDate = new Date(input.appointmentDate);
  await ensureNoCollision(input.department as Department, appointmentDate);

  try {
    return await prisma.appointment.create({
      data: {
        patientId,
        department: input.department as Department,
        appointmentDate,
        symptoms: input.symptoms,
        isEmergency: input.isEmergency
      },
      select: appointmentSelect
    });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      throw new AppointmentRuleError('Patient account does not exist');
    }
    throw error;
  }
}

export async function listAppointments(userId: string, canReadAll: boolean, filters: ListAppointmentsInput) {
  const where: Prisma.AppointmentWhereInput = {
    ...(canReadAll ? {} : { patientId: userId }),
    ...(filters.department ? { department: filters.department as Department } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.isEmergency === undefined ? {} : { isEmergency: filters.isEmergency }),
    ...(filters.search ? {
      OR: [
        { symptoms: { contains: filters.search, mode: 'insensitive' } },
        { patient: { name: { contains: filters.search, mode: 'insensitive' } } }
      ]
    } : {})
  };

  return prisma.appointment.findMany({ where, orderBy: { appointmentDate: 'asc' }, select: appointmentSelect });
}

export async function getAppointment(id: string) {
  const appointment = await prisma.appointment.findUnique({ where: { id }, select: appointmentSelect });
  if (!appointment) throw new AppointmentNotFoundError('Appointment not found');
  return appointment;
}

export async function updateOwnAppointment(id: string, patientId: string, input: UpdateAppointmentInput) {
  const appointment = await prisma.appointment.findUnique({ where: { id }, select: { id: true, patientId: true, status: true, department: true } });
  if (!appointment) throw new AppointmentNotFoundError('Appointment not found');
  if (appointment.patientId !== patientId) throw new AppointmentRuleError('You can only modify your own appointment');
  if (appointment.status !== AppointmentStatus.PENDING) throw new AppointmentRuleError('Only PENDING appointments can be modified by patients');

  if (input.appointmentDate) {
    await ensureNoCollision(appointment.department, new Date(input.appointmentDate), id);
  }

  return prisma.appointment.update({
    where: { id },
    data: {
      ...(input.appointmentDate ? { appointmentDate: new Date(input.appointmentDate) } : {}),
      ...(input.symptoms !== undefined ? { symptoms: input.symptoms } : {})
    },
    select: appointmentSelect
  });
}

export async function updateStatus(id: string, input: UpdateStatusInput) {
  const appointment = await prisma.appointment.findUnique({ where: { id }, select: { status: true } });
  if (!appointment) throw new AppointmentNotFoundError('Appointment not found');

  const allowed: Record<AppointmentStatus, AppointmentStatus[]> = {
    PENDING: [AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED],
    CONFIRMED: [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELLED],
    COMPLETED: [],
    CANCELLED: []
  };
  if (!allowed[appointment.status].includes(input.status)) {
    throw new AppointmentRuleError(`Invalid status transition from ${appointment.status} to ${input.status}`);
  }

  return prisma.appointment.update({ where: { id }, data: { status: input.status }, select: appointmentSelect });
}

export async function deleteOwnAppointment(id: string, patientId: string): Promise<void> {
  const appointment = await prisma.appointment.findUnique({ where: { id }, select: { patientId: true, status: true } });
  if (!appointment) throw new AppointmentNotFoundError('Appointment not found');
  if (appointment.patientId !== patientId) throw new AppointmentRuleError('You can only cancel your own appointment');
  if (appointment.status !== AppointmentStatus.PENDING) throw new AppointmentRuleError('Only PENDING appointments can be cancelled by patients');
  await prisma.appointment.update({ where: { id }, data: { status: AppointmentStatus.CANCELLED } });
}

export async function clearAppointments(): Promise<void> {
  await prisma.appointment.deleteMany();
}

export async function getAdminMetrics() {
  const [totalPatients, bookingsByDepartment] = await Promise.all([
    prisma.user.count({ where: { role: { name: 'PATIENT' } } }),
    prisma.appointment.groupBy({ by: ['department'], _count: { _all: true }, orderBy: { department: 'asc' } })
  ]);

  return {
    totalRegisteredPatients: totalPatients,
    bookingsPerDepartment: bookingsByDepartment.map((item) => ({ department: item.department, count: item._count._all }))
  };
}
