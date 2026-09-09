-- CreateEnum
CREATE TYPE "Department" AS ENUM ('GENERAL_PRACTICE', 'DENTISTRY', 'CARDIOLOGY', 'DERMATOLOGY', 'PEDIATRICS');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "roleId" TEXT NOT NULL,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "hashedRefreshToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "role_permissions" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId", "permissionId")
);

CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "department" "Department" NOT NULL,
    "appointmentDate" TIMESTAMP(3) NOT NULL,
    "symptoms" TEXT NOT NULL,
    "isEmergency" BOOLEAN NOT NULL DEFAULT false,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");
CREATE UNIQUE INDEX "permissions_action_key" ON "permissions"("action");
CREATE INDEX "users_roleId_idx" ON "users"("roleId");
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");
CREATE INDEX "appointments_appointmentDate_idx" ON "appointments"("appointmentDate");
CREATE INDEX "appointments_department_idx" ON "appointments"("department");
CREATE INDEX "appointments_patientId_idx" ON "appointments"("patientId");
CREATE INDEX "appointments_status_idx" ON "appointments"("status");
CREATE INDEX "appointments_department_appointmentDate_idx" ON "appointments"("department", "appointmentDate");

ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
