import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import z from 'zod';

import { chatService } from '../services/chat.service';
import {
   conversationRepository,
   type ConversationMessage,
} from '../repositories/conversation.repository';
import { serializeConversation } from './serializers';

const MAX_PROMPT_LENGTH = 2000;

const chatSchema = z.object({
   prompt: z
      .string()
      .trim()
      .min(1, 'Prompt is required')
      .max(
         MAX_PROMPT_LENGTH,
         `Prompt is too long. Use no more than ${MAX_PROMPT_LENGTH} characters`
      ),
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

function ensureUser(req: Request, res: Response): string | null {
   if (!req.user) {
      res.status(401).json({ error: 'Not authenticated.' });
      return null;
   }

   return req.user.id;
}

export const chatController = {
   async sendMessage(req: Request, res: Response) {
      const userId = ensureUser(req, res);

      if (!userId) {
         return;
      }

      const parseResult = chatSchema.safeParse(req.body);

      if (!parseResult.success) {
         const issue = parseResult.error.issues[0];
         const message = issue?.message ?? 'Invalid chat request.';

         res.status(400).json({
            error: message,
            errors: parseResult.error.format(),
         });
         return;
      }

      const { prompt, conversationId } = parseResult.data;
      const activeConversationId = conversationId ?? randomUUID();
      const timestamp = new Date();

      const title = buildTitleFromPrompt(prompt) ?? undefined;

      const conversation = conversationRepository.ensure(
         userId,
         activeConversationId
      );

      conversationRepository.updateTitleIfDefault(
         userId,
         activeConversationId,
         title ?? ''
      );
      conversationRepository.addMessage(userId, activeConversationId, {
         id: randomUUID(),
         role: 'user',
         content: prompt,
         createdAt: timestamp,
      });

      try {
         const response = await chatService.sendMessage(
            prompt,
            userId,
            activeConversationId
         );

         const assistantMessage: ConversationMessage = {
            id: response.id,
            role: 'assistant',
            content: response.message,
            createdAt: new Date(),
         };

         conversationRepository.addMessage(
            userId,
            activeConversationId,
            assistantMessage
         );

         const updatedConversation = conversationRepository.get(
            userId,
            activeConversationId
         );

         if (!updatedConversation) {
            res.status(500).json({
               error: 'Conversation could not be retrieved.',
            });
            return;
         }

         res.json({
            conversation: serializeConversation(updatedConversation),
         });
      } catch (error) {
         const failedConversation = conversationRepository.get(
            userId,
            activeConversationId
         );

         res.status(500).json({
            error: 'Failed to generate a response.',
            conversation: failedConversation
               ? serializeConversation(failedConversation)
               : undefined,
         });
      }
   },
};
