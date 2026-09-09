import test from 'node:test';
import assert from 'node:assert/strict';
import { RegisterSchema } from '../src/schemas/auth.schema.js';
import { CreateAppointmentSchema, ListAppointmentsSchema, UpdateAppointmentSchema } from '../src/schemas/appointment.schema.js';

const validAppointment = {
  department: 'GENERAL_PRACTICE',
  appointmentDate: '2099-09-10T10:30:00.000Z',
  symptoms: 'Persistent headache for three days',
  isEmergency: false
};

test('registration normalizes email and accepts a strong password', () => {
  const parsed = RegisterSchema.parse({
    body: {
      name: ' Abebe Kebede ',
      email: ' ABEBE@Example.COM ',
      password: 'StrongPass1!',
      phone: '+251911234567'
    }
  });
  assert.equal(parsed.body.name, 'Abebe Kebede');
  assert.equal(parsed.body.email, 'abebe@example.com');
});

test('weak passwords are rejected', () => {
  assert.throws(() => RegisterSchema.parse({ body: { name: 'Abebe', email: 'a@b.com', password: 'password' } }));
});

test('appointment defaults emergency to false', () => {
  const parsed = CreateAppointmentSchema.parse({ body: { ...validAppointment, isEmergency: undefined } });
  assert.equal(parsed.body.isEmergency, false);
});

test('appointment rejects outside clinic hours', () => {
  assert.throws(() => CreateAppointmentSchema.parse({ body: { ...validAppointment, appointmentDate: '2099-09-10T07:59:00.000Z' } }));
  assert.throws(() => CreateAppointmentSchema.parse({ body: { ...validAppointment, appointmentDate: '2099-09-10T17:00:00.000Z' } }));
});

test('appointment rejects dates in the past', () => {
  assert.throws(() => CreateAppointmentSchema.parse({ body: { ...validAppointment, appointmentDate: '2000-09-10T10:30:00.000Z' } }));
});

test('unknown appointment fields are rejected', () => {
  assert.throws(() => CreateAppointmentSchema.parse({ body: { ...validAppointment, status: 'CONFIRMED' } }));
});

test('empty appointment patch is rejected', () => {
  assert.throws(() => UpdateAppointmentSchema.parse({ body: {} }));
});

test('query boolean is coerced safely', () => {
  const parsed = ListAppointmentsSchema.parse({ query: { isEmergency: 'true' } });
  assert.equal(parsed.query.isEmergency, true);
  assert.throws(() => ListAppointmentsSchema.parse({ query: { isEmergency: 'not-a-boolean' } }));
});
