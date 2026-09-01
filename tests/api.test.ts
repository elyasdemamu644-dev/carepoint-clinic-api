import assert from 'node:assert/strict';
import { app } from '../src/app.js';
import { clearAppointments } from '../src/services/appointment.service.js';
import { Server } from 'node:http';

let server: Server;


async function main() {
  clearAppointments();
  server = await new Promise<Server>((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test server did not start');
  const base = `http://127.0.0.1:${address.port}`;
  const api = (path: string, options: RequestInit = {}) => fetch(`${base}${path}`, options);

  try {
    let response = await api('/api/health');
    assert.equal(response.status, 200);
    const health = await response.json();
    assert.equal(health.status, 'ok');
    assert.equal(typeof health.uptime, 'number');

    response = await api('/api/appointments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        patientName: '  Abebe Kebede  ',
        patientEmail: 'ABEBE@EXAMPLE.COM',
        patientPhone: '+251911234567',
        department: 'GENERAL_PRACTICE',
        appointmentDate: '2099-09-02T10:30:00.000Z',
        symptoms: 'Persistent headache for three days',
      }),
    });
    assert.equal(response.status, 201);
    const createdBody = await response.json();
    assert.equal(createdBody.data.patientName, 'Abebe Kebede');
    assert.equal(createdBody.data.patientEmail, 'abebe@example.com');
    assert.equal(createdBody.data.isEmergency, false);
    const id = createdBody.data.id as string;

    response = await api('/api/appointments?department=GENERAL_PRACTICE&isEmergency=false&search=headache');
    assert.equal(response.status, 200);
    const listBody = await response.json();
    assert.equal(listBody.count, 1);

    response = await api('/api/appointments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        patientName: 'Valid Patient',
        patientEmail: 'bad-email',
        patientPhone: '123',
        department: 'GENERAL_PRACTICE',
        appointmentDate: '2099-09-02T11:30:00.000Z',
        symptoms: 'Long enough symptom text',
      }),
    });
    assert.equal(response.status, 400);
    const invalidBody = await response.json();
    assert.ok(invalidBody.errors.some((e: { field: string }) => e.field === 'patientEmail'));
    assert.ok(invalidBody.errors.some((e: { field: string }) => e.field === 'patientPhone'));

    response = await api('/api/appointments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        patientName: 'Valid Patient',
        patientEmail: 'valid@example.com',
        patientPhone: '+251911234568',
        department: 'DENTISTRY',
        appointmentDate: '2000-09-02T11:30:00.000Z',
        symptoms: 'Long enough symptom text',
      }),
    });
    assert.equal(response.status, 400);

    response = await api('/api/appointments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        patientName: 'Valid Patient',
        patientEmail: 'valid@example.com',
        patientPhone: '+251911234568',
        department: 'DENTISTRY',
        appointmentDate: '2099-09-02T07:30:00.000Z',
        symptoms: 'Long enough symptom text',
      }),
    });
    assert.equal(response.status, 400);

    response = await api(`/api/appointments/${id}`);
    assert.equal(response.status, 200);

    response = await api('/api/appointments/not-real-id');
    assert.equal(response.status, 404);

    response = await api(`/api/appointments/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.equal(response.status, 400);

    response = await api(`/api/appointments/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ symptoms: 'Updated symptoms with enough detail' }),
    });
    assert.equal(response.status, 200);

    response = await api('/api/appointments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        patientName: 'Collision Test',
        patientEmail: 'collision@example.com',
        patientPhone: '+251911234569',
        department: 'GENERAL_PRACTICE',
        appointmentDate: '2099-09-02T10:59:00.000Z',
        symptoms: 'Another sufficiently detailed symptom',
      }),
    });
    assert.equal(response.status, 409);

    response = await api('/api/appointments/stats/overview');
    assert.equal(response.status, 200);
    const stats = await response.json();
    assert.equal(stats.data.total, 1);

    response = await api(`/api/appointments/${id}`, { method: 'DELETE' });
    assert.equal(response.status, 204);
    assert.equal(await response.text(), '');

    response = await api('/api/not-a-real-route');
    assert.equal(response.status, 404);

    console.log('All API checks passed.');
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
