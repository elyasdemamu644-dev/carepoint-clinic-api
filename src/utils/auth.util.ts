import bcrypt from 'bcrypt';
import jwt, { type SignOptions } from 'jsonwebtoken';
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import type { AuthUser } from '../types/express.js';

export type AccessTokenPayload = AuthUser & { type: 'access' };
export type RefreshTokenPayload = { userId: string; tokenVersion: number; type: 'refresh' };

const accessOptions = { expiresIn: env.ACCESS_TOKEN_EXPIRES_IN as SignOptions['expiresIn'] } as SignOptions;
const refreshOptions = { expiresIn: env.REFRESH_TOKEN_EXPIRES_IN as SignOptions['expiresIn'] } as SignOptions;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, env.BCRYPT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signAccessToken(user: AuthUser): string {
  return jwt.sign({ ...user, type: 'access' }, env.JWT_ACCESS_SECRET, accessOptions);
}

export function signRefreshToken(userId: string, tokenVersion: number): string {
  return jwt.sign({ userId, tokenVersion, type: 'refresh' }, env.JWT_REFRESH_SECRET, refreshOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
  if (!isAccessPayload(payload)) throw new Error('Invalid access token');
  return payload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const payload = jwt.verify(token, env.JWT_REFRESH_SECRET);
  if (!isRefreshPayload(payload)) throw new Error('Invalid refresh token');
  return payload;
}

function isAccessPayload(payload: string | jwt.JwtPayload): payload is AccessTokenPayload {
  return typeof payload !== 'string'
    && payload.type === 'access'
    && typeof payload.userId === 'string'
    && typeof payload.email === 'string'
    && typeof payload.role === 'string'
    && Array.isArray(payload.permissions)
    && payload.permissions.every((p) => typeof p === 'string')
    && typeof payload.tokenVersion === 'number';
}

function isRefreshPayload(payload: string | jwt.JwtPayload): payload is RefreshTokenPayload {
  return typeof payload !== 'string'
    && payload.type === 'refresh'
    && typeof payload.userId === 'string'
    && typeof payload.tokenVersion === 'number';
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function constantTimeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}
