import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TOKEN_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
  COOKIE_NAME: z.string().min(1).default('carepoint_refresh_token'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(12).max(31).default(12),
  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),
  GOOGLE_REDIRECT_URI: z.string().url().default('http://localhost:3000/api/auth/google/callback'),
  GOOGLE_SUCCESS_REDIRECT: z.string().default(''),
  SEED_DOCTOR_PASSWORD: z.string().min(8).default('DoctorPassword1!'),
  SEED_ADMIN_PASSWORD: z.string().min(8).default('AdminPassword1!')
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
