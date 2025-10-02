import type { CookieOptions } from 'express';

import { TOKEN_TTL_DAYS } from '../services/auth.service';

export const AUTH_COOKIE_NAME = 'ninogpt_session';

export const COOKIE_MAX_AGE_MS = TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;

const isProduction = process.env.NODE_ENV === 'production';

const baseCookieOptions: CookieOptions = {
   httpOnly: true,
   sameSite: 'lax',
   secure: isProduction,
   path: '/',
};

export function getAuthCookieOptions(): CookieOptions {
   return {
      ...baseCookieOptions,
      maxAge: COOKIE_MAX_AGE_MS,
   };
}

export function getClearAuthCookieOptions(): CookieOptions {
   return {
      ...baseCookieOptions,
   };
}
