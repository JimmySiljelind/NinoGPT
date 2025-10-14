import type { CookieOptions } from 'express';

export const AUTH_COOKIE_NAME = 'ninogpt_session';

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
   };
}

export function getClearAuthCookieOptions(): CookieOptions {
   return {
      ...baseCookieOptions,
   };
}
