import type { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';
import { register, login, refresh, logout, issueTokens } from '../services/auth.service.js';
import { verifyRefreshToken } from '../utils/auth.util.js';
import type { LoginInput, RegisterInput } from '../schemas/auth.schema.js';

const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(env.COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: REFRESH_MAX_AGE
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(env.COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth'
  });
}

export async function registerController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = res.locals.validated.body as RegisterInput;
    const result = await register(input);
    setRefreshCookie(res, result.tokens.refreshToken);
    res.status(201).json({ status: 'success', message: 'Patient account created', user: result.user, accessToken: result.tokens.accessToken });
  } catch (error: unknown) { next(error); }
}

export async function loginController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = res.locals.validated.body as LoginInput;
    const result = await login(input);
    setRefreshCookie(res, result.tokens.refreshToken);
    res.status(200).json({ status: 'success', message: 'Login successful', user: result.user, accessToken: result.tokens.accessToken });
  } catch (error: unknown) { next(error); }
}

export async function refreshController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.[env.COOKIE_NAME] as string | undefined;
    if (!token) {
      res.status(401).json({ status: 'error', message: 'Refresh cookie is required' });
      return;
    }
    let payload;
    try { payload = verifyRefreshToken(token); } catch { res.status(403).json({ status: 'error', message: 'Invalid or expired refresh token' }); return; }
    const result = await refresh(payload.userId, token, payload.tokenVersion);
    setRefreshCookie(res, result.tokens.refreshToken);
    res.status(200).json({ status: 'success', message: 'Tokens rotated', user: result.user, accessToken: result.tokens.accessToken });
  } catch (error: unknown) { next(error); }
}

export async function logoutController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await logout(req.user!.userId);
    clearRefreshCookie(res);
    res.status(200).json({ status: 'success', message: 'Logged out successfully' });
  } catch (error: unknown) { next(error); }
}

export async function googleCallbackTokenResponse(res: Response, userId: string): Promise<void> {
  const result = await issueTokens(userId);
  setRefreshCookie(res, result.tokens.refreshToken);
  if (env.GOOGLE_SUCCESS_REDIRECT) {
    res.redirect(`${env.GOOGLE_SUCCESS_REDIRECT}#accessToken=${encodeURIComponent(result.tokens.accessToken)}`);
    return;
  }
  res.status(200).json({ status: 'success', message: 'Google authentication successful', user: result.user, accessToken: result.tokens.accessToken });
}
