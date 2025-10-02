import type { NextFunction, Request, Response } from 'express';

import { AUTH_COOKIE_NAME } from '../config/auth-cookie';
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

export function attachUser(req: Request, _res: Response, next: NextFunction) {
   const token = extractToken(req);

   if (!token) {
      req.user = undefined;
      next();
      return;
   }

   const user = authService.verifyToken(token);

   if (!user) {
      req.user = undefined;
      next();
      return;
   }

   req.user = user;
   next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
   if (!req.user) {
      res.status(401).json({ error: 'Not authenticated.' });
      return;
   }

   next();
}
