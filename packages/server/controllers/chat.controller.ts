import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import z from 'zod';

import { chatService } from '../services/chat.service';
import {
   conversationRepository,
   type ConversationMessage,
} from '../repositories/conversation.repository';
import { serializeConversation } from './serializers';

// Implementation details
const chatSchema = z.object({
   prompt: z
      .string()
      .trim()
      .min(1, 'Prompt is required')
      .max(1000, 'Prompt is too long (max 1000 characters)'),
   conversationId: z.preprocess((value) => {
      if (typeof value !== 'string') {
         return undefined;
      }

      const trimmed = value.trim();
      return trimmed.length === 0 ? undefined : trimmed;
   }, z.string().uuid().optional()),
});

function buildTitleFromPrompt(prompt: string) {
   const trimmed = prompt.trim();

   if (!trimmed) {
      return null;
   }

   return trimmed.length > 48 ? `${trimmed.slice(0, 45)}...` : trimmed;
}

// Public interface
export const chatController = {
   async sendMessage(req: Request, res: Response) {
      const parseResult = chatSchema.safeParse(req.body);

      if (!parseResult.success) {
         res.status(400).json({ errors: parseResult.error.format() });
         return;
      }

      const { prompt, conversationId } = parseResult.data;
      const activeConversationId = conversationId ?? randomUUID();
      const timestamp = new Date();

      const title = buildTitleFromPrompt(prompt) ?? undefined;

      conversationRepository.ensure(activeConversationId);
      conversationRepository.updateTitleIfDefault(
         activeConversationId,
         title ?? ''
      );
      conversationRepository.addMessage(activeConversationId, {
         id: randomUUID(),
         role: 'user',
         content: prompt,
         createdAt: timestamp,
      });

      try {
         const response = await chatService.sendMessage(
            prompt,
            activeConversationId
         );

         const assistantMessage: ConversationMessage = {
            id: response.id,
            role: 'assistant',
            content: response.message,
            createdAt: new Date(),
         };

         conversationRepository.addMessage(
            activeConversationId,
            assistantMessage
         );

         const conversation = conversationRepository.get(activeConversationId);

         if (!conversation) {
            res.status(500).json({
               error: 'Conversation could not be retrieved.',
            });
            return;
         }

         res.json({ conversation: serializeConversation(conversation) });
      } catch (error) {
         const conversation = conversationRepository.get(activeConversationId);

         res.status(500).json({
            error: 'Failed to generate a response.',
            conversation: conversation
               ? serializeConversation(conversation)
               : undefined,
         });
      }
   },
};
