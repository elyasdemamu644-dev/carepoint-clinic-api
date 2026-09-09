import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../utils/auth.util.js';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : undefined;

  if (!token) {
    res.status(401).json({ status: 'error', message: 'Authentication required' });
    return;
  }

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json({ status: 'error', message: 'Invalid or expired access token' });
  }
}
