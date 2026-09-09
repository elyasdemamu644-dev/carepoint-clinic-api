import { z } from 'zod';

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one numeric digit')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special symbol');

const emailSchema = z.string()
  .trim()
  .email('Invalid email address format')
  .toLowerCase();

export const RegisterSchema = z.object({
  body: z.object({
    name: z.string().trim().min(3).max(60),
    email: emailSchema,
    password: passwordSchema,
    phone: z.string().trim().regex(/^\+?[0-9]{10,14}$/, 'Invalid phone number format (10-14 digits)').optional()
  }).strict()
});

export const LoginSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required')
  }).strict()
});

export type RegisterInput = z.infer<typeof RegisterSchema>['body'];
export type LoginInput = z.infer<typeof LoginSchema>['body'];
