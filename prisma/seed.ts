import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { env } from '../src/config/env.js';

const prisma = new PrismaClient();

const permissions = [
  ['appointments:create', 'Create an appointment'],
  ['appointments:read_own', 'Read owned appointments'],
  ['appointments:read_all', 'Read all appointments'],
  ['appointments:update_own', 'Update an owned pending appointment'],
  ['appointments:manage_status', 'Transition appointment status'],
  ['appointments:delete_own', 'Cancel an owned pending appointment'],
  ['system:admin', 'Access administrative metrics']
] as const;

const rolePermissions: Record<string, string[]> = {
  PATIENT: ['appointments:create', 'appointments:read_own', 'appointments:update_own', 'appointments:delete_own'],
  DOCTOR: ['appointments:read_all', 'appointments:manage_status'],
  ADMIN: permissions.map(([action]) => action)
};

async function main(): Promise<void> {
  const permissionMap = new Map<string, string>();
  for (const [action, description] of permissions) {
    const permission = await prisma.permission.upsert({ where: { action }, update: { description }, create: { action, description } });
    permissionMap.set(action, permission.id);
  }

  const roleMap = new Map<string, string>();
  for (const roleName of ['PATIENT', 'DOCTOR', 'ADMIN']) {
    const role = await prisma.role.upsert({ where: { name: roleName }, update: {}, create: { name: roleName } });
    roleMap.set(roleName, role.id);
  }

  for (const [roleName, actions] of Object.entries(rolePermissions)) {
    const roleId = roleMap.get(roleName)!;
    for (const action of actions) {
      const permissionId = permissionMap.get(action)!;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId } },
        update: {},
        create: { roleId, permissionId }
      });
    }
  }

  const doctorRoleId = roleMap.get('DOCTOR')!;
  const adminRoleId = roleMap.get('ADMIN')!;
  const doctorHash = await bcrypt.hash(env.SEED_DOCTOR_PASSWORD, env.BCRYPT_ROUNDS);
  const adminHash = await bcrypt.hash(env.SEED_ADMIN_PASSWORD, env.BCRYPT_ROUNDS);

  await prisma.user.upsert({
    where: { email: 'doctor@carepoint.local' },
    update: { name: 'CarePoint Doctor', passwordHash: doctorHash, roleId: doctorRoleId },
    create: { email: 'doctor@carepoint.local', name: 'CarePoint Doctor', passwordHash: doctorHash, roleId: doctorRoleId }
  });

  await prisma.user.upsert({
    where: { email: 'admin@carepoint.local' },
    update: { name: 'CarePoint Admin', passwordHash: adminHash, roleId: adminRoleId },
    create: { email: 'admin@carepoint.local', name: 'CarePoint Admin', passwordHash: adminHash, roleId: adminRoleId }
  });

  console.log('Seed completed. Roles, permissions, doctor and admin test accounts are ready.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
