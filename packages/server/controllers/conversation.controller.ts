import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';

import {
   conversationRepository,
   type ConversationMessage,
   type ConversationRecord,
} from '../repositories/conversation.repository';

function serializeMessage(message: ConversationMessage) {
   return {
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
   };
}

function serializeConversationSummary(conversation: ConversationRecord) {
   return {
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      messageCount: conversation.messages.length,
   };
}

function serializeConversation(conversation: ConversationRecord) {
   return {
      ...serializeConversationSummary(conversation),
      messages: conversation.messages.map(serializeMessage),
   };
}

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
};
