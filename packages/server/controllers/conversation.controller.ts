import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';

import { conversationRepository } from '../repositories/conversation.repository';
import {
   serializeConversation,
   serializeConversationSummary,
} from './serializers';

export const conversationController = {
   list(req: Request, res: Response) {
      const conversations = conversationRepository
         .list()
         .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
         .map(serializeConversationSummary);

      res.json({ conversations });
   },

   create(req: Request, res: Response) {
      const conversation = conversationRepository.create(randomUUID());
      res.status(201).json({
         conversation: serializeConversationSummary(conversation),
      });
   },

   get(req: Request, res: Response) {
      const conversationId = req.params.conversationId;

      if (!conversationId) {
         res.status(400).json({ error: 'Conversation id is required.' });
         return;
      }

      const conversation = conversationRepository.get(conversationId);

      if (!conversation) {
         res.status(404).json({ error: 'Conversation not found' });
         return;
      }

      res.json({ conversation: serializeConversation(conversation) });
   },

   delete(req: Request, res: Response) {
      const conversationId = req.params.conversationId;

      if (!conversationId) {
         res.status(400).json({ error: 'Conversation id is required.' });
         return;
      }

      const removed = conversationRepository.delete(conversationId);

      if (!removed) {
         res.status(404).json({ error: 'Conversation not found' });
         return;
      }

      res.status(204).send();
   },
};
