# CarePoint Enterprise Healthcare Booking API
**Author:** Elyas Demamu  
**ID:** ETS0489/17
**Healthcare Booking API with Authentication and Authorization**

This project upgrades the Assignment 7 CarePoint appointment API into an enterprise-style backend using **TypeScript, Express, Zod, PostgreSQL, Prisma, JWT, Bcrypt, PBAC, ABAC/ownership checks, and Google OAuth 2.0/OpenID Connect**.


## 1. Requirements implemented

- Strict Zod request validation and query coercion.
- TypeScript types inferred from Zod schemas.
- PostgreSQL persistence through Prisma.
- Normalized User / Role / Permission / RolePermission / Account / Appointment models.
- Cascade deletes where specified by the brief.
- Indexes and unique constraints.
- Local registration and login.
- Bcrypt password hashing with configurable cost, default **12**.
- 15-minute access token and 7-day refresh token defaults.
- Refresh token stored only as a SHA-256 hash in PostgreSQL.
- httpOnly + SameSite=Strict refresh cookie.
- Refresh Token Rotation (RTR).
- Refresh-token replay/reuse detection that revokes the user's refresh sessions.
- Google OAuth 2.0 / OpenID Connect authorization-code flow.
- Google account linking by verified email without duplicate User rows.
- Nullable local password for Google-only users.
- PBAC using permission strings in access-token claims.
- ABAC/resource ownership checks preventing patient IDOR.
- Appointment collision guard: same department + same UTC hour returns 409.
- Appointment status transition guard.
- Admin metrics endpoint.
- Layered routes → middleware → controllers → services → Prisma architecture.
- Centralized error handling and predictable HTTP status codes.

## 2. Project structure

```text
carepoint-enterprise-api/
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
├── .npmrc
├── README.md
├── requests.http
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
│       └── 20260907120000_init/
│           └── migration.sql
├── src/
│   ├── app.ts
│   ├── server.ts
│   ├── config/
│   │   └── env.ts
│   ├── lib/
│   │   └── prisma.ts
│   ├── schemas/
│   │   ├── auth.schema.ts
│   │   ├── appointment.schema.ts
│   │   └── common.schema.ts
│   ├── middlewares/
│   │   ├── validate.middleware.ts
│   │   ├── auth.middleware.ts
│   │   ├── permission.middleware.ts
│   │   ├── ownership.middleware.ts
│   │   ├── not-found.middleware.ts
│   │   └── error.middleware.ts
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── oauth.controller.ts
│   │   ├── appointment.controller.ts
│   │   └── admin.controller.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── oauth.service.ts
│   │   └── appointment.service.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── appointment.routes.ts
│   │   └── admin.routes.ts
│   ├── types/
│   │   └── express.d.ts
│   └── utils/
│       └── auth.util.ts
└── tests/
    └── validation.test.ts
```

## 3. Installation

### Prerequisites

- Node.js 18+
- PostgreSQL
- npm
- A Google Cloud OAuth client only if Google Sign-In is being tested

### Install

```bash
npm install
```

### Environment

Copy `.env.example` to `.env` and replace the secrets/database values.

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

**Never commit `.env`.**

## 4. PostgreSQL setup

Create a database, for example:

```sql
CREATE DATABASE carepoint;
```

Then set:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/carepoint"
```

Generate the Prisma client:

```bash
npm run prisma:generate
```

Apply the committed migration:

```bash
npm run prisma:deploy
```

For local development, this is also valid:

```bash
npm run prisma:migrate
```

Seed roles, permissions, and development doctor/admin accounts:

```bash
npm run prisma:seed
```

## 5. Start the API

Development:

```bash
npm run dev
```

Build:

```bash
npm run build
```

Production-style start:

```bash
npm start
```

Type-check only:

```bash
npm run typecheck
```

The default API URL is:

```text
http://localhost:3000
```

## 6. Seeded development accounts

After `npm run prisma:seed`:

- Doctor: `doctor@carepoint.local`
- Admin: `admin@carepoint.local`

Their passwords come from `SEED_DOCTOR_PASSWORD` and `SEED_ADMIN_PASSWORD` in `.env`.

Change those values before using the project outside local development.

## 7. Authentication endpoints

| Method | Endpoint | Access | Result |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Creates patient + access token + refresh cookie |
| POST | `/api/auth/login` | Public | Returns access token + refresh cookie |
| POST | `/api/auth/refresh` | Refresh cookie | Rotates both tokens |
| POST | `/api/auth/logout` | Authenticated | Revokes refresh session + clears cookie |
| GET | `/api/auth/google` | Public | Starts Google OAuth |
| GET | `/api/auth/google/callback` | Public | Validates Google identity, links account, issues tokens |

### Access token usage

Send the short-lived access token as:

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
```

The refresh token is intentionally **not** returned in JSON. It is stored in an httpOnly cookie.

## 8. Registration

```http
POST /api/auth/register
Content-Type: application/json
```

```json
{
  "name": "Abebe Kebede",
  "email": "ABEBE@example.com",
  "password": "StrongPass1!",
  "phone": "+251911234567"
}
```

Password requirements:

- At least 8 characters.
- At least one uppercase letter.
- At least one lowercase letter.
- At least one digit.
- At least one special symbol.

The email is trimmed and normalized to lowercase.

## 9. Login

```http
POST /api/auth/login
Content-Type: application/json
```

```json
{
  "email": "abebe@example.com",
  "password": "StrongPass1!"
}
```

A successful login returns the access token and sets the 7-day httpOnly refresh cookie.

## 10. Refresh Token Rotation and replay detection

Call:

```http
POST /api/auth/refresh
```

The browser/client sends the refresh cookie automatically.

On success, the server:

1. Verifies the refresh JWT.
2. Hashes the presented token with SHA-256.
3. Compares it with the stored refresh-token hash.
4. Issues a new 15-minute access token.
5. Issues a new 7-day refresh token.
6. Atomically replaces the stored hash.

If an already-rotated refresh token is presented, the hash no longer matches. The server increments `tokenVersion`, clears the stored refresh hash, and returns **403 Forbidden**, revoking the user's active refresh session.

## 11. Google OAuth 2.0 / OpenID Connect

Create a Google OAuth Web application and configure this redirect URI:

```text
http://localhost:3000/api/auth/google/callback
```

Set:

```env
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/google/callback"
```

Optional frontend redirect:

```env
GOOGLE_SUCCESS_REDIRECT="http://localhost:5173/oauth/success"
```

The callback verifies Google's ID token and requires a verified email. If the Google identity is new but its verified email belongs to an existing local account, the provider record is linked to that existing User rather than creating a duplicate User.

If `GOOGLE_SUCCESS_REDIRECT` is configured, the access token is returned in the URL fragment (`#accessToken=...`) rather than a query parameter, so it is not sent as an HTTP Referer to the destination server.

## 12. PBAC permissions

Permissions seeded by `prisma/seed.ts`:

- `appointments:create`
- `appointments:read_own`
- `appointments:read_all`
- `appointments:update_own`
- `appointments:manage_status`
- `appointments:delete_own`
- `system:admin`

Roles:

### PATIENT

- create appointments
- read own appointments
- update own pending appointments
- cancel own pending appointments

### DOCTOR

- read all appointments
- manage appointment status

### ADMIN

- all listed permissions

Permissions are embedded into the short-lived access token, allowing authorization middleware to make PBAC decisions without a database lookup for every request.

## 13. Appointment endpoints

| Method | Endpoint | Permission | Main rule |
|---|---|---|---|
| POST | `/api/appointments` | `appointments:create` | Appointment belongs to `req.user.userId` |
| GET | `/api/appointments` | Authenticated | Patient sees own; authorized clinicians/admins can see all |
| GET | `/api/appointments/:id` | `appointments:read_own` | Owner OR `appointments:read_all` |
| PATCH | `/api/appointments/:id` | `appointments:update_own` | Owner + PENDING only; date/symptoms only |
| PATCH | `/api/appointments/:id/status` | `appointments:manage_status` | Doctor/Admin status transitions |
| DELETE | `/api/appointments/:id` | `appointments:delete_own` | Owner + PENDING only; implemented as cancellation |

### Appointment creation

```http
POST /api/appointments
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
```

```json
{
  "department": "GENERAL_PRACTICE",
  "appointmentDate": "2026-09-10T10:30:00.000Z",
  "symptoms": "Persistent headache for three days",
  "isEmergency": false
}
```

Rules:

- Department must be one of the five specified enum values.
- Datetime must be ISO-8601.
- Datetime must be strictly in the future.
- UTC hour must be from 08:00 inclusive to before 17:00.
- Symptoms: 10–1,000 characters.
- Emergency defaults to false.
- Status defaults to PENDING.

## 14. Appointment list filters

```text
GET /api/appointments?department=DENTISTRY
GET /api/appointments?status=PENDING
GET /api/appointments?isEmergency=true
GET /api/appointments?search=headache
```

Filters can be combined.

`isEmergency=true` and `isEmergency=false` are coerced to booleans by Zod.

## 15. Ownership / IDOR protection

The server never trusts an appointment ID by itself.

For owner-only operations, the ownership middleware loads the appointment and compares:

```text
appointment.patientId === req.user.userId
```

If another patient attempts to access, edit, or cancel the appointment, the API returns **403 Forbidden**.

For `GET /api/appointments/:id`, a user with `appointments:read_all` can use the authorized override.

## 16. Collision protection

The API rejects an active appointment when another appointment already exists in the same department during the same UTC hour.

Example:

```text
Existing: 2026-09-10T10:15:00Z, DENTISTRY
New:      2026-09-10T10:45:00Z, DENTISTRY
```

Result:

```http
409 Conflict
```

Cancelled appointments do not block a new booking in that hour.

## 17. Status transitions

The service prevents invalid clinical status transitions:

```text
PENDING    -> CONFIRMED
PENDING    -> CANCELLED
CONFIRMED  -> COMPLETED
CONFIRMED  -> CANCELLED
```

`COMPLETED` and `CANCELLED` are terminal states.

## 18. Admin metrics

```http
GET /api/admin/metrics
Authorization: Bearer ADMIN_ACCESS_TOKEN
```

Required permission:

```text
system:admin
```

Returns total registered patients and appointment counts grouped by department.

## 19. Health check

```http
GET /api/health
```

Returns HTTP 200 with a server timestamp and uptime.

## 20. Error/status behavior

The implementation uses the assignment's expected statuses, including:

- `200 OK` — successful reads, updates, login, refresh, logout, health.
- `201 Created` — registration and appointment creation.
- `204 No Content` — patient cancellation endpoint.
- `400 Bad Request` — Zod validation and invalid domain input.
- `401 Unauthorized` — missing/invalid access authentication.
- `403 Forbidden` — authorization failure, IDOR attempt, or refresh-token replay.
- `404 Not Found` — missing appointment or route.
- `409 Conflict` — collision or unique constraint conflict.
- `500 Internal Server Error` — unexpected server errors.

## 21. Testing and quality checks

Static type check:

```bash
npm run typecheck
```

Build:

```bash
npm run build
```

Validation tests:

```bash
npm test
```

Manual API requests are also provided in `requests.http`.

### Recommended final verification order

```bash
npm install
npm run prisma:generate
npm run prisma:deploy
npm run prisma:seed
npm run typecheck
npm run build
npm test
npm run dev
```

Then verify:

1. Health endpoint.
2. Patient registration.
3. Patient login.
4. Patient appointment creation.
5. Own appointment list/read/update/cancel.
6. Second patient cannot access the first patient's appointment.
7. Doctor login and all-appointment access.
8. Doctor status transition.
9. Admin metrics.
10. Duplicate department/hour returns 409.
11. Refresh rotates the refresh token.
12. Reusing the old refresh token returns 403 and revokes the refresh session.
13. Google OAuth works when Google credentials are configured.
14. Local account + same verified Google email links to one User record.

## 22. Security notes

- `.env` is ignored by Git.
- Access tokens are short-lived.
- Refresh tokens are httpOnly cookies.
- Refresh tokens are never stored in plaintext in the database.
- Refresh-token comparisons use a constant-time comparison after hashing.
- Refresh rotation uses a conditional database update to reduce concurrent replay races.
- Google OAuth state is signed and short-lived.
- Google email must be verified before account linking.
- Unknown request body fields are rejected by strict Zod objects.
- Ownership is checked server-side against the authenticated user's ID.
- Passwords are never returned in API responses.
