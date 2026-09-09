import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { comparePassword, hashPassword, hashRefreshToken, constantTimeEqualHex, signAccessToken, signRefreshToken } from '../utils/auth.util.js';
import type { LoginInput, RegisterInput } from '../schemas/auth.schema.js';

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: string;
};

export type TokenPair = { accessToken: string; refreshToken: string };

const userInclude = {
  role: { include: { permissions: { include: { permission: true } } } }
} as const;

function toAuthUser(user: Prisma.UserGetPayload<{ include: typeof userInclude }>) {
  return {
    userId: user.id,
    email: user.email,
    role: user.role.name,
    permissions: user.role.permissions.map((rp) => rp.permission.action),
    tokenVersion: user.tokenVersion
  };
}

function toPublicUser(user: Prisma.UserGetPayload<{ include: typeof userInclude }>): PublicUser {
  return { id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role.name };
}

async function findUserById(userId: string) {
  return prisma.user.findUnique({ where: { id: userId }, include: userInclude });
}

export async function issueTokens(userId: string): Promise<{ tokens: TokenPair; user: PublicUser }> {
  const user = await findUserById(userId);
  if (!user) throw new Error('User not found');

  const authUser = toAuthUser(user);
  const accessToken = signAccessToken(authUser);
  const refreshToken = signRefreshToken(user.id, user.tokenVersion);

  await prisma.user.update({
    where: { id: user.id },
    data: { hashedRefreshToken: hashRefreshToken(refreshToken) }
  });

  return { tokens: { accessToken, refreshToken }, user: toPublicUser(user) };
}

export async function register(input: RegisterInput): Promise<{ tokens: TokenPair; user: PublicUser }> {
  const role = await prisma.role.findUnique({ where: { name: 'PATIENT' } });
  if (!role) throw new Error('PATIENT role is not seeded');

  const passwordHash = await hashPassword(input.password);
  try {
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        roleId: role.id,
        ...(input.phone ? { phone: input.phone } : {})
      }
    });
    return issueTokens(user.id);
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictError('An account with this email already exists');
    }
    throw error;
  }
}

export async function login(input: LoginInput): Promise<{ tokens: TokenPair; user: PublicUser }> {
  const user = await prisma.user.findUnique({ where: { email: input.email }, include: userInclude });
  if (!user?.passwordHash || !(await comparePassword(input.password, user.passwordHash))) {
    throw new UnauthorizedError('Invalid email or password');
  }
  return issueTokens(user.id);
}

export async function refresh(userId: string, presentedRefreshToken: string, tokenVersion: number): Promise<{ tokens: TokenPair; user: PublicUser }> {
  const current = await findUserById(userId);
  if (!current) throw new ForbiddenError('Refresh token is no longer valid');

  const presentedHash = hashRefreshToken(presentedRefreshToken);
  const tokenMatches = current.tokenVersion === tokenVersion
    && !!current.hashedRefreshToken
    && constantTimeEqualHex(current.hashedRefreshToken, presentedHash);

  if (!tokenMatches) {
    await prisma.user.update({
      where: { id: current.id },
      data: { hashedRefreshToken: null, tokenVersion: { increment: 1 } }
    });
    throw new ForbiddenError('Refresh token reuse detected; all refresh sessions were revoked');
  }

  const nextVersion = current.tokenVersion;
  const accessToken = signAccessToken(toAuthUser(current));
  const refreshToken = signRefreshToken(current.id, nextVersion);
  const nextHash = hashRefreshToken(refreshToken);

  const updated = await prisma.user.updateMany({
    where: { id: current.id, tokenVersion: nextVersion, hashedRefreshToken: current.hashedRefreshToken },
    data: { hashedRefreshToken: nextHash }
  });

  if (updated.count !== 1) {
    await prisma.user.update({
      where: { id: current.id },
      data: { hashedRefreshToken: null, tokenVersion: { increment: 1 } }
    });
    throw new ForbiddenError('Refresh token reuse detected; all refresh sessions were revoked');
  }

  return { tokens: { accessToken, refreshToken }, user: toPublicUser(current) };
}

export async function logout(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { hashedRefreshToken: null, tokenVersion: { increment: 1 } }
  });
}

export async function findOrLinkGoogleUser(google: { sub: string; email: string; name: string; phone?: string | null }): Promise<string> {
  const existingAccount = await prisma.account.findUnique({
    where: { provider_providerAccountId: { provider: 'GOOGLE', providerAccountId: google.sub } },
    select: { userId: true }
  });
  if (existingAccount) return existingAccount.userId;

  const role = await prisma.role.findUnique({ where: { name: 'PATIENT' } });
  if (!role) throw new Error('PATIENT role is not seeded');

  const existingUser = await prisma.user.findUnique({ where: { email: google.email } });
  if (existingUser) {
    await prisma.account.create({ data: { userId: existingUser.id, provider: 'GOOGLE', providerAccountId: google.sub } });
    return existingUser.id;
  }

  const user = await prisma.user.create({
    data: {
      email: google.email,
      name: google.name,
      phone: google.phone ?? null,
      passwordHash: null,
      roleId: role.id,
      accounts: { create: { provider: 'GOOGLE', providerAccountId: google.sub } }
    }
  });
  return user.id;
}

export class ConflictError extends Error { readonly statusCode = 409; }
export class UnauthorizedError extends Error { readonly statusCode = 401; }
export class ForbiddenError extends Error { readonly statusCode = 403; }
