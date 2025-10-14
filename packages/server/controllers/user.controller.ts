import type { Request, Response } from 'express';
import { z } from 'zod';

import { authService } from '../services/auth.service';
import { userService } from '../services/user.service';
import { PASSWORD_MIN_LENGTH } from '../security/password';

const profileSchema = z.object({
   email: z.string().email('Please provide a valid email.'),
   name: z.string().min(1, 'Name is required.').max(120),
   phone: z
      .string()
      .regex(
         /^\(\+\d{1,3}\)\s?\d{10,15}$/,
         'Phone number must include a country code and at least 10 digits.'
      ),
});

const passwordSchema = z.object({
   currentPassword: z.string().min(1, 'Current password is required.'),
   newPassword: z
      .string()
      .min(
         PASSWORD_MIN_LENGTH,
         `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`
      )
      .max(128, 'Password cannot exceed 128 characters.')
      .refine((value) => /[A-Z]/.test(value), {
         message: 'Password must include at least one uppercase letter.',
      })
      .refine((value) => /[^A-Za-z0-9]/.test(value), {
         message: 'Password must include at least one special character.',
      }),
});

function ensureUser(req: Request, res: Response): string | null {
   if (!req.user) {
      res.status(401).json({ error: 'Not authenticated.' });
      return null;
   }

   return req.user.id;
}

function parseValidationError(error: z.ZodError): string {
   const firstIssue = error.issues[0];
   return firstIssue?.message ?? 'Invalid input.';
}

export const userController = {
   updateProfile(req: Request, res: Response) {
      const userId = ensureUser(req, res);

      if (!userId) {
         return;
      }

      const result = profileSchema.safeParse(req.body ?? {});

      if (!result.success) {
         res.status(400).json({
            error: parseValidationError(result.error),
            details: result.error.flatten().fieldErrors,
         });
         return;
      }

      try {
         const user = userService.updateProfile({
            userId,
            email: result.data.email,
            name: result.data.name,
            phone: result.data.phone,
         });

         res.json({ user: authService.toPublicUser(user) });
      } catch (error) {
         const message =
            error instanceof Error
               ? error.message
               : 'Failed to update profile.';
         res.status(400).json({ error: message });
      }
   },

   changePassword(req: Request, res: Response) {
      const userId = ensureUser(req, res);

      if (!userId) {
         return;
      }

      const result = passwordSchema.safeParse(req.body ?? {});

      if (!result.success) {
         res.status(400).json({
            error: parseValidationError(result.error),
            details: result.error.flatten().fieldErrors,
         });
         return;
      }

      try {
         const user = userService.changePassword({
            userId,
            currentPassword: result.data.currentPassword,
            newPassword: result.data.newPassword,
         });

         res.json({ user: authService.toPublicUser(user) });
      } catch (error) {
         const message =
            error instanceof Error
               ? error.message
               : 'Failed to change password.';
         res.status(400).json({ error: message });
      }
   },
};
