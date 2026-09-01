import type { NextFunction, Request, Response } from 'express';
import { ZodError, type AnyZodObject } from 'zod';

export const validateRequest = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      res.locals.validated = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          status: 'error',
          message: 'Input validation failed',
          errors: error.errors.map((err) => ({
            field: err.path.join('.').replace(/^body\./, '').replace(/^query\./, 'query.'),
            message: err.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
};
