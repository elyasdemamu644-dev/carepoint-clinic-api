import { randomUUID } from 'node:crypto';
import type {
  CreateAppointmentInput,
  Department,
  ListAppointmentsQuery,
  UpdateAppointmentInput,
} from '../schemas/appointment.schema.js';

export interface Appointment {
  id: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  department: Department;
  appointmentDate: string;
  isEmergency: boolean;
  symptoms: string;
  createdAt: string;
  updatedAt: string;
}

export class AppointmentNotFoundError extends Error {
  constructor(id: string) {
    super(`Appointment with ID '${id}' was not found`);
    this.name = 'AppointmentNotFoundError';
  }
}

export class AppointmentCollisionError extends Error {
  constructor() {
    super('An appointment already exists in this department at the same hour');
    this.name = 'AppointmentCollisionError';
  }
}

const appointments: Appointment[] = [];

function sameDepartmentAndHour(a: Appointment, b: { department: Department; appointmentDate: string }): boolean {
  if (a.department !== b.department) return false;
  const first = new Date(a.appointmentDate);
  const second = new Date(b.appointmentDate);
  return (
    first.getUTCFullYear() === second.getUTCFullYear() &&
    first.getUTCMonth() === second.getUTCMonth() &&
    first.getUTCDate() === second.getUTCDate() &&
    first.getUTCHours() === second.getUTCHours()
  );
}

function assertNoCollision(input: { department: Department; appointmentDate: string }, ignoreId?: string): void {
  const collision = appointments.some(
    (appointment) => appointment.id !== ignoreId && sameDepartmentAndHour(appointment, input),
  );
  if (collision) throw new AppointmentCollisionError();
}

export function createAppointment(input: CreateAppointmentInput): Appointment {
  assertNoCollision(input);
  const now = new Date().toISOString();
  const appointment: Appointment = {
    id: randomUUID(),
    ...input,
    appointmentDate: new Date(input.appointmentDate).toISOString(),
    createdAt: now,
    updatedAt: now,
  };
  appointments.push(appointment);
  return appointment;
}

export function listAppointments(filters: ListAppointmentsQuery): Appointment[] {
  const search = filters.search?.toLowerCase();
  return appointments.filter((appointment) => {
    const departmentMatches = !filters.department || appointment.department === filters.department;
    const emergencyMatches = filters.isEmergency === undefined || appointment.isEmergency === filters.isEmergency;
    const searchMatches =
      !search ||
      appointment.patientName.toLowerCase().includes(search) ||
      appointment.symptoms.toLowerCase().includes(search);
    return departmentMatches && emergencyMatches && searchMatches;
  });
}

export function getAppointmentById(id: string): Appointment {
  const appointment = appointments.find((item) => item.id === id);
  if (!appointment) throw new AppointmentNotFoundError(id);
  return appointment;
}

export function updateAppointment(id: string, input: UpdateAppointmentInput): Appointment {
  const appointment = getAppointmentById(id);
  const nextDepartment = input.department ?? appointment.department;
  const nextDate = input.appointmentDate ?? appointment.appointmentDate;
  assertNoCollision({ department: nextDepartment, appointmentDate: nextDate }, id);

  Object.assign(appointment, input);
  if (input.appointmentDate) appointment.appointmentDate = new Date(input.appointmentDate).toISOString();
  appointment.updatedAt = new Date().toISOString();
  return appointment;
}

export function deleteAppointment(id: string): void {
  const index = appointments.findIndex((item) => item.id === id);
  if (index === -1) throw new AppointmentNotFoundError(id);
  appointments.splice(index, 1);
}

export function getOverviewStats() {
  const byDepartment: Record<Department, number> = {
    GENERAL_PRACTICE: 0,
    DENTISTRY: 0,
    CARDIOLOGY: 0,
    DERMATOLOGY: 0,
    PEDIATRICS: 0,
  };
  let emergency = 0;
  for (const appointment of appointments) {
    byDepartment[appointment.department] += 1;
    if (appointment.isEmergency) emergency += 1;
  }
  return {
    total: appointments.length,
    byDepartment,
    byEmergencyStatus: {
      emergency,
      nonEmergency: appointments.length - emergency,
    },
  };
}

export function clearAppointments(): void {
  appointments.length = 0;
}
