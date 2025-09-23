import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import z from 'zod';

import { chatService } from '../services/chat.service';

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

// Public interface
export const chatController = {
   async sendMessage(req: Request, res: Response) {
      const parseResult = chatSchema.safeParse(req.body);

      if (!parseResult.success) {
         res.status(400).json({ errors: parseResult.error.format() });
         return;
      }

      try {
         const { prompt, conversationId } = parseResult.data;
         const activeConversationId = conversationId ?? randomUUID();
         const response = await chatService.sendMessage(
            prompt,
            activeConversationId
         );

         res.json({
            message: response.message,
            conversationId: activeConversationId,
         });
      } catch (error) {
         res.status(500).json({ error: 'Failed to generate a response.' });
      }
   },
};
