import type { Request, Response, NextFunction } from 'express';
import { authenticateGoogleCallback, createGoogleAuthorizationUrl } from '../services/oauth.service.js';
import { googleCallbackTokenResponse } from './auth.controller.js';

export function googleRedirectController(_req: Request, res: Response, next: NextFunction): void {
  try { res.redirect(createGoogleAuthorizationUrl()); }
  catch (error: unknown) { next(error); }
}

export async function googleCallbackController(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const validated = res.locals.validated.query as { code?: string; state?: string; error?: string };
    if (validated.error) {
      res.status(400).json({ status: 'error', message: `Google authorization failed: ${validated.error}` });
      return;
    }
    const code = validated.code;
    const state = validated.state;
    if (!code) {
      res.status(400).json({ status: 'error', message: 'Missing Google authorization code' });
      return;
    }
    const userId = await authenticateGoogleCallback(code, state);
    await googleCallbackTokenResponse(res, userId);
  } catch (error: unknown) { next(error); }
}
