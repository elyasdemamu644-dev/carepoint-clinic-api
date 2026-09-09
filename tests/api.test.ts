import assert from 'node:assert/strict';
import { Server } from 'node:http';
import { app } from '../src/app.js';
import { clearAppointments } from '../src/services/appointment.service.js';

let server: Server;

async function main(): Promise<void> {
  await clearAppointments();

  server = await new Promise<Server>((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });

  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test server did not start');

  const baseUrl = `http://127.0.0.1:${address.port}`;
  const api = (path: string, options: RequestInit = {}) => fetch(`${baseUrl}${path}`, options);

  try {
    let response = await api('/api/health');
    assert.equal(response.status, 200);
    const health = await response.json();
    assert.equal(health.status, 'success');
    assert.equal(typeof health.data.uptime, 'number');

    const patient = {
      name: 'Elyas Demamu',
      email: `elyas-${Date.now()}@example.com`,
      password: 'StrongPass1!',
      phone: '+251911234567'
    };

    response = await api('/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(patient)
    });
    assert.equal(response.status, 201);
    const registerBody = await response.json();
    assert.equal(registerBody.user.email, patient.email.toLowerCase());
    assert.ok(typeof registerBody.accessToken === 'string');

    const accessToken = registerBody.accessToken as string;
    const appointmentDate = '2099-09-02T10:30:00.000Z';

    response = await api('/api/appointments', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        department: 'GENERAL_PRACTICE',
        appointmentDate,
        symptoms: 'Persistent headache for three days',
        isEmergency: false
      })
    });
    assert.equal(response.status, 201);
    const created = await response.json();
    assert.equal(created.data.patient.email, patient.email.toLowerCase());
    assert.equal(created.data.department, 'GENERAL_PRACTICE');
    const id = created.data.id as string;

    response = await api('/api/appointments', {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    assert.equal(response.status, 200);
    const list = await response.json();
    assert.equal(list.status, 'success');
    assert.ok(Array.isArray(list.data));
    assert.equal(list.data.length, 1);

    response = await api(`/api/appointments/${id}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({ symptoms: 'Updated symptoms with enough detail for the patient consultation' })
    });
    assert.equal(response.status, 200);
    const updated = await response.json();
    assert.equal(updated.data.symptoms, 'Updated symptoms with enough detail for the patient consultation');

    response = await api('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'admin@carepoint.local', password: 'AdminPassword1!' })
    });
    assert.equal(response.status, 200);
    const adminLogin = await response.json();
    const adminToken = adminLogin.accessToken as string;

    response = await api('/api/admin/metrics', {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.equal(response.status, 200);
    const metrics = await response.json();
    assert.equal(metrics.status, 'success');
    assert.ok(typeof metrics.data.totalRegisteredPatients === 'number');

    response = await api(`/api/appointments/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    assert.equal(response.status, 204);
    assert.equal(await response.text(), '');

    response = await api('/api/not-a-real-route');
    assert.equal(response.status, 404);

    console.log('API checks passed.');
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
