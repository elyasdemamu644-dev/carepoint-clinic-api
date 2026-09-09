import { OAuth2Client } from 'google-auth-library';
import { randomBytes } from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import { findOrLinkGoogleUser } from './auth.service.js';

const STATE_EXPIRES_IN = '10m' as const;

type GoogleState = { type: 'google_oauth_state'; nonce: string };

function getClient(): OAuth2Client {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    throw new OAuthConfigurationError('Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.');
  }
  return new OAuth2Client(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_REDIRECT_URI);
}

export function createGoogleAuthorizationUrl(): string {
  const client = getClient();
  const state = jwt.sign(
    { type: 'google_oauth_state', nonce: cryptoRandomString() } satisfies GoogleState,
    env.JWT_ACCESS_SECRET,
    { expiresIn: STATE_EXPIRES_IN } as SignOptions
  );
  return client.generateAuthUrl({
    access_type: 'online',
    scope: ['openid', 'email', 'profile'],
    state,
    prompt: 'select_account'
  });
}

export async function authenticateGoogleCallback(code: string, state: string | undefined): Promise<string> {
  const client = getClient();
  if (!state) throw new OAuthValidationError('Missing OAuth state');

  let statePayload: string | jwt.JwtPayload;
  try {
    statePayload = jwt.verify(state, env.JWT_ACCESS_SECRET);
  } catch {
    throw new OAuthValidationError('Invalid or expired OAuth state');
  }
  if (typeof statePayload === 'string' || statePayload.type !== 'google_oauth_state') {
    throw new OAuthValidationError('Invalid OAuth state');
  }

  const { tokens } = await client.getToken(code);
  if (!tokens.id_token) throw new OAuthValidationError('Google did not return an ID token');

  const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: env.GOOGLE_CLIENT_ID });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email || payload.email_verified !== true) {
    throw new OAuthValidationError('Google account email could not be verified');
  }

  return findOrLinkGoogleUser({
    sub: payload.sub,
    email: payload.email.trim().toLowerCase(),
    name: payload.name?.trim() || payload.email.split('@')[0] || 'Google Patient',
    phone: null
  });
}

function cryptoRandomString(): string {
  return randomBytes(32).toString('hex');
}

export class OAuthConfigurationError extends Error { readonly statusCode = 503; }
export class OAuthValidationError extends Error { readonly statusCode = 400; }
