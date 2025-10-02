import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';

import { conversationRepository } from '../repositories/conversation.repository';
import { projectRepository } from '../repositories/project.repository';
import {
   serializeConversation,
   serializeConversationSummary,
} from './serializers';

function ensureUser(req: Request, res: Response): string | null {
   if (!req.user) {
      res.status(401).json({ error: 'Not authenticated.' });
      return null;
   }

   return req.user.id;
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

      const projectId =
         typeof req.body?.projectId === 'string'
            ? (req.body.projectId as string)
            : null;

      if (projectId && !projectRepository.exists(userId, projectId)) {
         res.status(404).json({ error: 'Project not found.' });
         return;
      }

      try {
         const conversation = conversationRepository.create(
            userId,
            randomUUID(),
            projectId
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

      const conversationId = req.params.conversationId;

      if (!conversationId) {
         res.status(400).json({ error: 'Conversation id is required.' });
         return;
      }

      const conversation = conversationRepository.get(userId, conversationId);

      if (!conversation) {
         res.status(404).json({ error: 'Conversation not found' });
         return;
      }

      res.json({ conversation: serializeConversation(conversation) });
   },

   update(req: Request, res: Response) {
      const userId = ensureUser(req, res);

      if (!userId) {
         return;
      }

      const conversationId = req.params.conversationId;

      if (!conversationId) {
         res.status(400).json({ error: 'Conversation id is required.' });
         return;
      }

      const { projectId, title } = (req.body ?? {}) as {
         projectId?: string | null;
         title?: string;
      };

      if (typeof projectId === 'undefined' && typeof title === 'undefined') {
         res.status(400).json({ error: 'No updates were provided.' });
         return;
      }

      try {
         let conversation = conversationRepository.get(userId, conversationId);

         if (!conversation) {
            res.status(404).json({ error: 'Conversation not found' });
            return;
         }

         if (typeof projectId !== 'undefined') {
            const normalizedProjectId =
               projectId === null || projectId === '' ? null : projectId;

            if (
               normalizedProjectId &&
               !projectRepository.exists(userId, normalizedProjectId)
            ) {
               res.status(404).json({ error: 'Project not found.' });
               return;
            }

            const updated = conversationRepository.setProject(
               userId,
               conversationId,
               normalizedProjectId
            );

            if (!updated) {
               res.status(404).json({ error: 'Conversation not found' });
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
            res.status(404).json({ error: 'Conversation not found' });
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

      const conversationId = req.params.conversationId;

      if (!conversationId) {
         res.status(400).json({ error: 'Conversation id is required.' });
         return;
      }

      const removed = conversationRepository.delete(userId, conversationId);

      if (!removed) {
         res.status(404).json({ error: 'Conversation not found' });
         return;
      }

      res.status(204).send();
   },
};
