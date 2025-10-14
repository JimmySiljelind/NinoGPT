import type { NextFunction, Request, Response } from 'express';

import {
   AUTH_COOKIE_NAME,
   getClearAuthCookieOptions,
} from '../config/auth-cookie';
import { authService } from '../services/auth.service';

function extractToken(req: Request): string | null {
   const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];

   if (typeof cookieToken === 'string' && cookieToken) {
      return cookieToken;
   }

   const bearerToken = req.headers.authorization;

   if (typeof bearerToken === 'string' && bearerToken.startsWith('Bearer ')) {
      return bearerToken.substring('Bearer '.length).trim();
   }

   return null;
}

export function attachUser(req: Request, res: Response, next: NextFunction) {
   const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];
   const token = extractToken(req);

   if (!token) {
      req.user = undefined;
      next();
      return;
   }

   let user: ReturnType<typeof authService.verifyToken>;

   try {
      // Guard against tampered tokens raising unexpected verification errors.
      user = authService.verifyToken(token);
   } catch (error) {
      console.error('Failed to verify auth token', {
         message: error instanceof Error ? error.message : 'unknown error',
      });
      user = null;
   }

   if (!user) {
      if (typeof cookieToken === 'string' && cookieToken) {
         res.clearCookie(AUTH_COOKIE_NAME, getClearAuthCookieOptions());
      }
      req.user = undefined;
      next();
      return;
   }

   req.user = user;
   next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
   if (!req.user) {
      if (typeof req.cookies?.[AUTH_COOKIE_NAME] === 'string') {
         res.clearCookie(AUTH_COOKIE_NAME, getClearAuthCookieOptions());
      }
      res.status(401).json({ error: 'Not authenticated.' });
      return;
   }

   next();
}
