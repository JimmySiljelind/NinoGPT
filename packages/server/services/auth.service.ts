import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import {
   userRepository,
   type UserRecord,
} from '../repositories/user.repository';

export const TOKEN_TTL_DAYS = 7;

const jwtSecret = process.env.JWT_SECRET ?? 'dev-secret';

if (!process.env.JWT_SECRET) {
   console.warn(
      'JWT_SECRET is not set. Using a fallback value for development; set JWT_SECRET in production.'
   );
}

type TokenPayload = {
   sub: string;
   iat?: number;
   exp?: number;
};

export type PublicUser = {
   id: string;
   email: string;
   name: string;
   dateOfBirth: string;
   phone: string;
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
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
   };
}

function hashPassword(password: string): string {
   const trimmed = password.trim();

   if (!trimmed) {
      throw new Error('Password cannot be empty.');
   }

   return bcrypt.hashSync(trimmed, 12);
}

function verifyPassword(password: string, hash: string): boolean {
   if (!password) {
      return false;
   }

   return bcrypt.compareSync(password, hash);
}

function normalizeEmail(email: string): string {
   return email.trim().toLowerCase();
}

export const authService = {
   registerUser(params: {
      email: string;
      password: string;
      name: string;
      dateOfBirth: Date;
      phone: string;
   }): UserRecord {
      const email = normalizeEmail(params.email);
      const existing = userRepository.findByEmail(email);

      if (existing) {
         throw new Error('Email is already registered.');
      }

      try {
         const user = userRepository.create({
            id: randomUUID(),
            email,
            passwordHash: hashPassword(params.password),
            name: params.name,
            dateOfBirth: params.dateOfBirth,
            phone: params.phone,
         });

         return user;
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

   authenticateUser(params: {
      email: string;
      password: string;
   }): UserRecord | null {
      const email = normalizeEmail(params.email);
      const user = userRepository.findByEmail(email);

      if (!user) {
         return null;
      }

      const matches = verifyPassword(params.password, user.passwordHash);

      if (!matches) {
         return null;
      }

      userRepository.touch(user.id);
      return userRepository.findById(user.id) ?? user;
   },

   issueToken(userId: string): string {
      const payload: TokenPayload = { sub: userId };
      return jwt.sign(payload, jwtSecret, { expiresIn: `${TOKEN_TTL_DAYS}d` });
   },

   verifyToken(token: string): UserRecord | null {
      try {
         const decoded = jwt.verify(token, jwtSecret) as TokenPayload;
         if (!decoded || typeof decoded.sub !== 'string') {
            return null;
         }

         return userRepository.findById(decoded.sub);
      } catch (error) {
         if (error instanceof jwt.JsonWebTokenError) {
            return null;
         }
         throw error;
      }
   },

   toPublicUser,
};
