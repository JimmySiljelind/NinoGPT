import type { CookieOptions } from 'express';

import { env } from './env';
import { TOKEN_TTL_DAYS } from '../services/auth.service';

export const AUTH_COOKIE_NAME = 'ninogpt_session';

const baseCookieOptions: CookieOptions = {
   httpOnly: true,
   sameSite: env.isProduction ? 'strict' : 'lax',
   secure: env.isProduction,
   path: '/',
   maxAge: TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000, // Keep cookie lifespan aligned with token TTL.
};

export function getAuthCookieOptions(): CookieOptions {
   return {
      ...baseCookieOptions,
   };
}

export function getClearAuthCookieOptions(): CookieOptions {
   return {
      ...baseCookieOptions,
   };
}
