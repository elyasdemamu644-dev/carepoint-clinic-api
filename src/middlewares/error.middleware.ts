import type { ErrorRequestHandler } from 'express';
import { Prisma } from '@prisma/client';

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  console.error(error);

  if (typeof error === 'object' && error !== null && 'statusCode' in error && typeof (error as { statusCode?: unknown }).statusCode === 'number') {
    const statusCode = (error as { statusCode: number }).statusCode;
    res.status(statusCode).json({ status: 'error', message: error instanceof Error ? error.message : 'Request failed' });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      res.status(409).json({ status: 'error', message: 'A unique constraint was violated' });
      return;
    }
    if (error.code === 'P2025') {
      res.status(404).json({ status: 'error', message: 'Requested resource was not found' });
      return;
    }
  }

  res.status(500).json({ status: 'error', message: 'Internal server error' });
};
