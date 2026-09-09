import type { NextFunction, Request, Response } from 'express';

export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }
    if (!req.user.permissions.includes(permission)) {
      res.status(403).json({ status: 'error', message: `Forbidden: missing permission ${permission}` });
      return;
    }
    next();
  };
}

export function requireAnyPermission(...permissions: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ status: 'error', message: 'Authentication required' });
      return;
    }
    if (!permissions.some((permission) => req.user!.permissions.includes(permission))) {
      res.status(403).json({ status: 'error', message: `Forbidden: requires one of: ${permissions.join(', ')}` });
      return;
    }
    next();
  };
}
