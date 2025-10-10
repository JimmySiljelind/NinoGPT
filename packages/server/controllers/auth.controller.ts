import type { Request, Response } from 'express';
import { z } from 'zod';

import { authService, type PublicUser } from '../services/auth.service';
import {
   AUTH_COOKIE_NAME,
   getAuthCookieOptions,
   getClearAuthCookieOptions,
} from '../config/auth-cookie';

const MINIMUM_AGE_YEARS = 10;
const MAXIMUM_AGE_YEARS = 120;

const passwordSchema = z
   .string()
   .min(8, 'Password must be at least 8 characters long.')
   .max(128, 'Password cannot exceed 128 characters.')
   .refine((value) => /[A-Z]/.test(value), {
      message: 'Password must include at least one uppercase letter.',
   })
   .refine((value) => /[^A-Za-z0-9]/.test(value), {
      message: 'Password must include at least one special character.',
   });

const registrationSchema = z.object({
   email: z.string().email('Please provide a valid email address.'),
   password: passwordSchema,
   name: z.string().min(1, 'Name is required.').max(120),
   dateOfBirth: z.string().min(4, 'Date of birth is required.'),
   phone: z
      .string()
      .regex(
         /^\(\+\d{1,3}\)\s?\d{6,15}$/,
         'Phone number must include a country code and at least 10 digits.'
      )
      .transform((value) => value.trim()),
});

const loginSchema = z.object({
   email: z.string().email('Please provide a valid email address.'),
   password: z.string().min(1, 'Password is required.'),
});

function calculateAge(date: Date): number {
   const today = new Date();
   let age = today.getFullYear() - date.getFullYear();
   const monthDiff = today.getMonth() - date.getMonth();
   const dayDiff = today.getDate() - date.getDate();

   if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      age -= 1;
   }

   return age;
}

function parseDateOfBirth(input: string): Date {
   const date = new Date(input);

   if (Number.isNaN(date.getTime())) {
      throw new Error('Invalid date of birth.');
   }

   const today = new Date();
   if (date > today) {
      throw new Error('Date of birth cannot be in the future.');
   }

   const age = calculateAge(date);

   if (age < MINIMUM_AGE_YEARS) {
      throw new Error(
         `You must be at least ${MINIMUM_AGE_YEARS} years old to create an account.`
      );
   }

   if (age > MAXIMUM_AGE_YEARS) {
      throw new Error('Please enter a realistic date of birth.');
   }

   return date;
}

function getFirstValidationError(error: z.ZodError): string | null {
   const flattened = error.flatten();
   const fieldErrors = Object.values(flattened.fieldErrors)
      .flat()
      .filter((message): message is string => Boolean(message));

   const [firstFieldError] = fieldErrors;
   if (firstFieldError) {
      return firstFieldError;
   }

   const [firstFormError] = flattened.formErrors;
   if (firstFormError) {
      return firstFormError;
   }

   const [firstIssue] = error.issues;
   return firstIssue?.message ?? null;
}

function sendUserResponse(res: Response, user: PublicUser, status = 200) {
   res.status(status).json({ user });
}

export const authController = {
   register(req: Request, res: Response) {
      try {
         const payload = registrationSchema.parse(req.body ?? {});
         const dateOfBirth = parseDateOfBirth(payload.dateOfBirth);

         const user = authService.registerUser({
            email: payload.email,
            password: payload.password,
            name: payload.name,
            dateOfBirth,
            phone: payload.phone,
         });

         const token = authService.issueToken(user.id);

         res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
         sendUserResponse(res, authService.toPublicUser(user), 201);
      } catch (error) {
         if (error instanceof z.ZodError) {
            const message =
               getFirstValidationError(error) ??
               'Invalid registration details.';

            res.status(400).json({
               error: message,
               details: error.flatten().fieldErrors,
            });
            return;
         }

         const message =
            error instanceof Error
               ? error.message
               : 'Failed to create account.';
         res.status(400).json({ error: message });
      }
   },

   login(req: Request, res: Response) {
      try {
         const payload = loginSchema.parse(req.body ?? {});
         const user = authService.authenticateUser({
            email: payload.email,
            password: payload.password,
         });

         if (!user) {
            res.status(401).json({ error: 'Invalid email or password.' });
            return;
         }

         const token = authService.issueToken(user.id);
         res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
         sendUserResponse(res, authService.toPublicUser(user));
      } catch (error) {
         if (error instanceof z.ZodError) {
            res.status(400).json({
               error: 'Invalid login request.',
               details: error.flatten().fieldErrors,
            });
            return;
         }

         const message =
            error instanceof Error ? error.message : 'Failed to sign in.';
         res.status(400).json({ error: message });
      }
   },

   me(req: Request, res: Response) {
      if (!req.user) {
         res.status(401).json({ error: 'Not authenticated.' });
         return;
      }

      sendUserResponse(res, authService.toPublicUser(req.user));
   },

   logout(_req: Request, res: Response) {
      res.clearCookie(AUTH_COOKIE_NAME, getClearAuthCookieOptions());
      res.status(204).send();
   },
};
