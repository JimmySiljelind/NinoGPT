import type { Request, Response } from 'express';
import { z } from 'zod';

import { authService } from '../services/auth.service';
import { userRepository } from '../repositories/user.repository';
import { conversationRepository } from '../repositories/conversation.repository';
import {
   serializeConversation,
   serializeConversationSummary,
} from './serializers';
import {
   normalizeEmail,
   normalizeName,
   normalizePhone,
} from '../validation/user-data';
import { hashPassword, PasswordPolicyError } from '../security/password';

const userIdSchema = z.string().uuid('Invalid user id.');
const conversationIdSchema = z.string().uuid('Invalid conversation id.');

const toggleAccessSchema = z.object({
   isActive: z.boolean(),
});

const updateProfileSchema = z.object({
   email: z.string().email('Please provide a valid email address.'),
   name: z.string().min(1, 'Name is required.').max(120),
   phone: z
      .string()
      .regex(
         /^\(\+\d{1,3}\)\s?\d{10,15}$/,
         'Phone number must include a country code and at least 10 digits.'
      ),
});

const setPasswordSchema = z.object({
   newPassword: z.string().min(1, 'New password is required.'),
});

function parseUserIdParam(value: unknown, res: Response): string | null {
   if (typeof value !== 'string') {
      res.status(400).json({ error: 'User id is required.' });
      return null;
   }

   const trimmed = value.trim();

   if (!trimmed) {
      res.status(400).json({ error: 'User id is required.' });
      return null;
   }

   const result = userIdSchema.safeParse(trimmed);

   if (!result.success) {
      res.status(400).json({ error: 'Invalid user id.' });
      return null;
   }

   return result.data;
}

function parseConversationIdParam(
   value: unknown,
   res: Response
): string | null {
   if (typeof value !== 'string') {
      res.status(400).json({ error: 'Conversation id is required.' });
      return null;
   }

   const trimmed = value.trim();

   if (!trimmed) {
      res.status(400).json({ error: 'Conversation id is required.' });
      return null;
   }

   const result = conversationIdSchema.safeParse(trimmed);

   if (!result.success) {
      res.status(400).json({ error: 'Invalid conversation id.' });
      return null;
   }

   return result.data;
}

function ensureTargetUser(userId: string, res: Response) {
   const user = userRepository.findById(userId);

   if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return null;
   }

   return user;
}

export const adminController = {
   listUsers(req: Request, res: Response) {
      const users = userRepository.listAll().map((user) => ({
         ...authService.toPublicUser(user),
         isSelf: req.user?.id === user.id,
      }));

      res.json({ users });
   },

   updateUserAccess(req: Request, res: Response) {
      const userId = parseUserIdParam(req.params.userId, res);

      if (!userId) {
         return;
      }

      const targetUser = ensureTargetUser(userId, res);

      if (!targetUser) {
         return;
      }

      if (targetUser.id === req.user?.id) {
         res.status(400).json({
            error: 'You cannot change your own access.',
         });
         return;
      }

      if (targetUser.role === 'admin') {
         res.status(403).json({
            error: 'Access changes for other admins are not permitted.',
         });
         return;
      }

      const payload = toggleAccessSchema.safeParse(req.body ?? {});

      if (!payload.success) {
         const issue = payload.error.issues[0];
         res.status(400).json({
            error: issue?.message ?? 'Invalid request payload.',
            details: payload.error.flatten().fieldErrors,
         });
         return;
      }

      const updated = userRepository.updateAccess(
         userId,
         payload.data.isActive
      );
      res.json({ user: authService.toPublicUser(updated) });
   },

   deleteUser(req: Request, res: Response) {
      const userId = parseUserIdParam(req.params.userId, res);

      if (!userId) {
         return;
      }

      const targetUser = ensureTargetUser(userId, res);

      if (!targetUser) {
         return;
      }

      if (targetUser.id === req.user?.id) {
         res.status(400).json({
            error: 'You cannot delete your own account.',
         });
         return;
      }

      if (targetUser.role === 'admin') {
         res.status(403).json({
            error: 'Deleting other admins is not permitted.',
         });
         return;
      }

      const removed = userRepository.delete(userId);

      if (!removed) {
         res.status(404).json({ error: 'User not found.' });
         return;
      }

      res.status(204).send();
   },

   listUserConversations(req: Request, res: Response) {
      const userId = parseUserIdParam(req.params.userId, res);

      if (!userId) {
         return;
      }

      const targetUser = ensureTargetUser(userId, res);

      if (!targetUser) {
         return;
      }

      const conversations = conversationRepository
         .list(userId)
         .map(serializeConversationSummary);
      const archivedConversations = conversationRepository
         .listArchived(userId)
         .map(serializeConversationSummary);

      res.json({
         user: authService.toPublicUser(targetUser),
         conversations,
         archivedConversations,
      });
   },

   getUserConversation(req: Request, res: Response) {
      const userId = parseUserIdParam(req.params.userId, res);

      if (!userId) {
         return;
      }

      const targetUser = ensureTargetUser(userId, res);

      if (!targetUser) {
         return;
      }

      if (targetUser.role === 'admin') {
         res.status(400).json({
            error: 'Selected user does not have accessible conversations.',
         });
         return;
      }

      const conversationId = parseConversationIdParam(
         req.params.conversationId,
         res
      );

      if (!conversationId) {
         return;
      }

      const conversation = conversationRepository.get(userId, conversationId);

      if (!conversation) {
         res.status(404).json({ error: 'Conversation not found.' });
         return;
      }

      res.json({
         user: authService.toPublicUser(targetUser),
         conversation: serializeConversation(conversation),
      });
   },

   updateUserProfile(req: Request, res: Response) {
      const userId = parseUserIdParam(req.params.userId, res);

      if (!userId) {
         return;
      }

      const targetUser = ensureTargetUser(userId, res);

      if (!targetUser) {
         return;
      }

      const payload = updateProfileSchema.safeParse(req.body ?? {});

      if (!payload.success) {
         const issue = payload.error.issues[0];
         res.status(400).json({
            error: issue?.message ?? 'Invalid profile details.',
            details: payload.error.flatten().fieldErrors,
         });
         return;
      }

      try {
         const updated = userRepository.updateProfile(userId, {
            email: normalizeEmail(payload.data.email),
            name: normalizeName(payload.data.name),
            phone: normalizePhone(payload.data.phone),
         });

         res.json({ user: authService.toPublicUser(updated) });
      } catch (error) {
         const message =
            error instanceof Error ? error.message : 'Failed to update user.';
         res.status(400).json({ error: message });
      }
   },

   setUserPassword(req: Request, res: Response) {
      const userId = parseUserIdParam(req.params.userId, res);

      if (!userId) {
         return;
      }

      const targetUser = ensureTargetUser(userId, res);

      if (!targetUser) {
         return;
      }

      const payload = setPasswordSchema.safeParse(req.body ?? {});

      if (!payload.success) {
         const issue = payload.error.issues[0];
         res.status(400).json({
            error: issue?.message ?? 'Invalid password payload.',
            details: payload.error.flatten().fieldErrors,
         });
         return;
      }

      try {
         const passwordHash = hashPassword(payload.data.newPassword);
         const updatedUser = userRepository.updatePassword(
            userId,
            passwordHash
         );
         res.json({ user: authService.toPublicUser(updatedUser) });
      } catch (error) {
         if (error instanceof PasswordPolicyError) {
            res.status(400).json({ error: error.message });
            return;
         }

         const message =
            error instanceof Error
               ? error.message
               : 'Failed to update password.';
         res.status(400).json({ error: message });
      }
   },

   deleteUserConversation(req: Request, res: Response) {
      const userId = parseUserIdParam(req.params.userId, res);

      if (!userId) {
         return;
      }

      const targetUser = ensureTargetUser(userId, res);

      if (!targetUser) {
         return;
      }

      if (targetUser.role === 'admin') {
         res.status(400).json({
            error: 'Selected user does not have accessible conversations.',
         });
         return;
      }

      const conversationId = parseConversationIdParam(
         req.params.conversationId,
         res
      );

      if (!conversationId) {
         return;
      }

      const removed = conversationRepository.delete(userId, conversationId);

      if (!removed) {
         res.status(404).json({ error: 'Conversation not found.' });
         return;
      }

      res.status(204).send();
   },
};
