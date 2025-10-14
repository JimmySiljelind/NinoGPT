import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { z } from 'zod';

import {
   conversationRepository,
   type ConversationType,
} from '../repositories/conversation.repository';
import { projectRepository } from '../repositories/project.repository';
import {
   serializeConversation,
   serializeConversationSummary,
} from './serializers';

const TITLE_MAX_LENGTH = 120;

function ensureUser(req: Request, res: Response): string | null {
   if (!req.user) {
      res.status(401).json({ error: 'Not authenticated.' });
      return null;
   }

   return req.user.id;
}

const conversationTypeSchema = z.enum(['text', 'image']);

const createConversationSchema = z.object({
   projectId: z.string().uuid('Invalid project id.').optional(),
   type: conversationTypeSchema.optional(),
});

const updateConversationSchema = z
   .object({
      projectId: z
         .union([z.string().uuid('Invalid project id.'), z.null()])
         .optional(),
      title: z
         .string()
         .trim()
         .min(1, 'Title cannot be empty.')
         .max(
            TITLE_MAX_LENGTH,
            `Title cannot exceed ${TITLE_MAX_LENGTH} characters.`
         )
         .optional(),
   })
   .refine(
      (data) =>
         typeof data.projectId !== 'undefined' ||
         typeof data.title !== 'undefined',
      { message: 'No updates were provided.' }
   );

const conversationIdSchema = z.string().uuid('Invalid conversation id.');

function parseConversationIdParam(
   value: unknown,
   res: Response
): string | null {
   if (typeof value !== 'string') {
      res.status(400).json({ error: 'Conversation id is required.' }); // Ensure missing params return 400.
      return null;
   }

   const trimmed = value.trim();

   if (!trimmed) {
      res.status(400).json({ error: 'Conversation id is required.' });
      return null;
   }

   const result = conversationIdSchema.safeParse(trimmed);

   if (!result.success) {
      res.status(400).json({ error: 'Invalid conversation id.' }); // Guard against malformed UUIDs.
      return null;
   }

   return result.data;
}

function getValidationMessage(error: z.ZodError): string {
   const issue = error.issues[0];
   return issue?.message ?? 'Invalid request payload.';
}

function normalizeType(input: ConversationType | undefined): ConversationType {
   return input === 'image' ? 'image' : 'text';
}

export const conversationController = {
   list(req: Request, res: Response) {
      const userId = ensureUser(req, res);

      if (!userId) {
         return;
      }

      const conversations = conversationRepository
         .list(userId)
         .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
         .map(serializeConversationSummary);

      res.json({ conversations });
   },

   create(req: Request, res: Response) {
      const userId = ensureUser(req, res);

      if (!userId) {
         return;
      }

      const payloadResult = createConversationSchema.safeParse(req.body ?? {});

      if (!payloadResult.success) {
         res.status(400).json({
            error: getValidationMessage(payloadResult.error),
            details: payloadResult.error.flatten().fieldErrors,
         });
         return;
      }

      const { projectId, type } = payloadResult.data;

      if (projectId && !projectRepository.exists(userId, projectId)) {
         res.status(404).json({ error: 'Project not found.' });
         return;
      }

      try {
         const conversation = conversationRepository.create(
            userId,
            randomUUID(),
            projectId ?? null,
            normalizeType(type)
         );

         res.status(201).json({
            conversation: serializeConversationSummary(conversation),
         });
      } catch (error) {
         const message =
            error instanceof Error
               ? error.message
               : 'Failed to create conversation.';
         res.status(400).json({ error: message });
      }
   },

   get(req: Request, res: Response) {
      const userId = ensureUser(req, res);

      if (!userId) {
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

      res.json({ conversation: serializeConversation(conversation) });
   },

   update(req: Request, res: Response) {
      const userId = ensureUser(req, res);

      if (!userId) {
         return;
      }

      const conversationId = parseConversationIdParam(
         req.params.conversationId,
         res
      );

      if (!conversationId) {
         return;
      }

      const payloadResult = updateConversationSchema.safeParse(req.body ?? {});

      if (!payloadResult.success) {
         res.status(400).json({
            error: getValidationMessage(payloadResult.error),
            details: payloadResult.error.flatten().fieldErrors,
         });
         return;
      }

      const { projectId, title } = payloadResult.data;

      try {
         let conversation = conversationRepository.get(userId, conversationId);

         if (!conversation) {
            res.status(404).json({ error: 'Conversation not found.' });
            return;
         }

         if (typeof projectId !== 'undefined') {
            if (projectId && !projectRepository.exists(userId, projectId)) {
               res.status(404).json({ error: 'Project not found.' });
               return;
            }

            const updated = conversationRepository.setProject(
               userId,
               conversationId,
               projectId ?? null
            );

            if (!updated) {
               res.status(404).json({ error: 'Conversation not found.' });
               return;
            }

            conversation = updated;
         }

         if (typeof title === 'string') {
            conversation = conversationRepository.updateTitle(
               userId,
               conversationId,
               title
            );
         }

         if (!conversation) {
            res.status(404).json({ error: 'Conversation not found.' });
            return;
         }

         res.json({
            conversation: serializeConversationSummary(conversation),
         });
      } catch (error) {
         const message =
            error instanceof Error
               ? error.message
               : 'Failed to update conversation.';
         res.status(400).json({ error: message });
      }
   },

   delete(req: Request, res: Response) {
      const userId = ensureUser(req, res);

      if (!userId) {
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

   listArchived(req: Request, res: Response) {
      const userId = ensureUser(req, res);

      if (!userId) {
         return;
      }

      const conversations = conversationRepository
         .listArchived(userId)
         .map(serializeConversationSummary);

      res.json({ conversations });
   },

   archive(req: Request, res: Response) {
      const userId = ensureUser(req, res);

      if (!userId) {
         return;
      }

      const conversationId = parseConversationIdParam(
         req.params.conversationId,
         res
      );

      if (!conversationId) {
         return;
      }

      const conversation = conversationRepository.archive(
         userId,
         conversationId
      );

      if (!conversation) {
         res.status(404).json({ error: 'Conversation not found.' });
         return;
      }

      res.json({ conversation: serializeConversationSummary(conversation) });
   },

   unarchive(req: Request, res: Response) {
      const userId = ensureUser(req, res);

      if (!userId) {
         return;
      }

      const conversationId = parseConversationIdParam(
         req.params.conversationId,
         res
      );

      if (!conversationId) {
         return;
      }

      const conversation = conversationRepository.unarchive(
         userId,
         conversationId
      );

      if (!conversation) {
         res.status(404).json({ error: 'Conversation not found.' });
         return;
      }

      res.json({ conversation: serializeConversationSummary(conversation) });
   },

   deleteAll(req: Request, res: Response) {
      const userId = ensureUser(req, res);

      if (!userId) {
         return;
      }

      const deleted = conversationRepository.deleteAll(userId);
      res.json({ deleted });
   },

   deleteArchived(req: Request, res: Response) {
      const userId = ensureUser(req, res);

      if (!userId) {
         return;
      }

      const deleted = conversationRepository.deleteArchived(userId);
      res.json({ deleted });
   },
};
