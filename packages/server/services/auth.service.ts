import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';

import {
   userRepository,
   type UserRecord,
} from '../repositories/user.repository';
import { env } from '../config/env';
import {
   hashPassword as hashPasswordStrict,
   verifyPassword as verifyPasswordStrict,
} from '../security/password';
import {
   ensureNonEmptyString,
   normalizeDateOfBirth,
   normalizeEmail,
   normalizeName,
   normalizePhone,
} from '../validation/user-data';

export const TOKEN_TTL_DAYS = 7;

const JWT_ALGORITHM: jwt.Algorithm = 'HS256';

type TokenPayload = {
   sub: string;
   iat?: number;
   exp?: number;
};

type RegisterUserParams = {
   email: string;
   password: string;
   name: string;
   dateOfBirth: Date;
   phone: string;
};

type AuthenticateUserParams = {
   email: string;
   password: string;
};

const jwtSecret = resolveJwtSecret();

function resolveJwtSecret(): string {
   const raw = env.jwtSecret;

   if (typeof raw === 'string') {
      const trimmed = raw.trim();

      if (trimmed.length >= 32) {
         return trimmed;
      }

      console.warn(
         'JWT_SECRET is present but shorter than 32 characters. Provide a stronger secret.'
      );

      if (trimmed.length > 0 && !env.isProduction) {
         return trimmed;
      }
   }

   if (env.isProduction) {
      throw new Error(
         'JWT_SECRET environment variable must be set to a strong value (>= 32 characters) in production.'
      );
   }

   console.warn(
      'JWT_SECRET is not set or insecure. Using a fallback value for non-production only; set JWT_SECRET in production.'
   );

   // Safe fallback secret for non-production usage only.
   return 'insecure-development-secret-change-me';
}

export type PublicUser = {
   id: string;
   email: string;
   name: string;
   dateOfBirth: string;
   phone: string;
   role: UserRecord['role'];
   isActive: boolean;
   createdAt: string;
   updatedAt: string;
};

function toPublicUser(user: UserRecord): PublicUser {
   return {
      id: user.id,
      email: user.email,
      name: user.name,
      dateOfBirth: user.dateOfBirth.toISOString(),
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
   };
}

export const authService = {
   registerUser(params: RegisterUserParams): UserRecord {
      if (!params || typeof params !== 'object') {
         throw new TypeError('params is required.');
      }

      const email = normalizeEmail(params.email);
      const existing = userRepository.findByEmail(email);

      if (existing) {
         throw new Error('Email is already registered.');
      }

      const name = normalizeName(params.name);
      const dateOfBirth = normalizeDateOfBirth(params.dateOfBirth);
      const phone = normalizePhone(params.phone);
      const passwordHash = hashPasswordStrict(params.password); // Apply centralized password policy.

      try {
         return userRepository.create({
            id: randomUUID(),
            email,
            passwordHash,
            name,
            dateOfBirth,
            phone,
         });
      } catch (error) {
         if (
            error instanceof Error &&
            error.message.includes('UNIQUE constraint failed: users.email')
         ) {
            throw new Error('Email is already registered.');
         }

         throw error;
      }
   },

   authenticateUser(params: AuthenticateUserParams): UserRecord | null {
      if (!params || typeof params !== 'object') {
         return null;
      }

      let email: string;

      try {
         email = normalizeEmail(params.email);
      } catch {
         return null;
      }

      const user = userRepository.findByEmail(email);

      if (!user) {
         return null;
      }

      const matches = verifyPasswordStrict(params.password, user.passwordHash);

      if (!matches) {
         return null;
      }

      try {
         userRepository.touch(user.id);
      } catch (error) {
         // Authentication should proceed even if the timestamp update fails.
         console.warn('Failed to update user timestamp', {
            userId: user.id,
            reason: error instanceof Error ? error.message : 'unknown error',
         });
      }

      return userRepository.findById(user.id) ?? user;
   },

   issueToken(userId: string): string {
      const normalizedUserId = ensureNonEmptyString(userId, 'userId');

      const payload: TokenPayload = { sub: normalizedUserId };
      return jwt.sign(payload, jwtSecret, {
         algorithm: JWT_ALGORITHM,
         expiresIn: `${TOKEN_TTL_DAYS}d`,
      });
   },

   verifyToken(token: string): UserRecord | null {
      if (typeof token !== 'string') {
         return null;
      }

      const trimmed = token.trim();

      if (!trimmed) {
         return null;
      }

      try {
         const decoded = jwt.verify(trimmed, jwtSecret, {
            algorithms: [JWT_ALGORITHM],
         }) as TokenPayload;

         if (!decoded || typeof decoded.sub !== 'string') {
            return null;
         }

         const userId = decoded.sub.trim();

         if (!userId) {
            return null;
         }

         return userRepository.findById(userId);
      } catch (error) {
         if (error instanceof jwt.JsonWebTokenError) {
            return null;
         }

         throw error;
      }
   },
   toPublicUser,
};
