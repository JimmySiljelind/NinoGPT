import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import z from 'zod';

import { imageService } from '../services/image.service';
import {
   conversationRepository,
   type ConversationMessage,
} from '../repositories/conversation.repository';
import { serializeConversation } from './serializers';

const MAX_PROMPT_LENGTH = 1000;

const imageChatSchema = z.object({
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

function ensureUser(req: Request, res: Response): string | null {
   if (!req.user) {
      res.status(401).json({ error: 'Not authenticated.' });
      return null;
   }

   return req.user.id;
}

function buildTitleFromPrompt(prompt: string) {
   const trimmed = prompt.trim();

   if (!trimmed) {
      return null;
   }

   return trimmed.length > 48 ? `${trimmed.slice(0, 45)}...` : trimmed;
}

export const imageChatController = {
   async generateImage(req: Request, res: Response) {
      const userId = ensureUser(req, res);

      if (!userId) {
         return;
      }

      const parseResult = imageChatSchema.safeParse(req.body);

      if (!parseResult.success) {
         const issue = parseResult.error.issues[0];
         const message = issue?.message ?? 'Invalid image generation request.';

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

      try {
         conversationRepository.ensure(
            userId,
            activeConversationId,
            null,
            'image'
         );
      } catch (error) {
         const message =
            error instanceof Error
               ? error.message
               : 'Unable to prepare conversation.';

         res.status(400).json({ error: message });
         return;
      }

      conversationRepository.updateTitleIfDefault(
         userId,
         activeConversationId,
         title ?? ''
      );

      const userMessage: ConversationMessage = {
         id: randomUUID(),
         role: 'user',
         content: prompt,
         createdAt: timestamp,
      };

      conversationRepository.addMessage(
         userId,
         activeConversationId,
         userMessage
      );

      try {
         const result = await imageService.generateImage(prompt);

         const assistantMessage: ConversationMessage = {
            id: randomUUID(),
            role: 'assistant',
            content: `data:image/png;base64,${result.base64}`,
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

         // Normalize upstream errors into user-friendly status codes.
         const message =
            error instanceof Error ? error.message.toLowerCase() : '';
         const isConfigError = message.includes('api key is not configured');
         const isTimeout = message.includes('timed out');
         const status = isConfigError ? 503 : isTimeout ? 504 : 500;
         const errorMessage = isTimeout
            ? 'The image request timed out. Please try again.'
            : isConfigError
              ? 'Image generation is currently unavailable.'
              : 'Failed to generate an image.';

         res.status(status).json({
            error: errorMessage,
            conversation: failedConversation
               ? serializeConversation(failedConversation)
               : undefined,
         });
      }
   },
};
