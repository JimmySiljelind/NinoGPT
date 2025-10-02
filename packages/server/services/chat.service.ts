import OpenAI from 'openai';
import { conversationRepository } from '../repositories/conversation.repository';

// Implementation detail
const client = new OpenAI({
   apiKey: process.env.OPENAI_API_KEY,
});

const RESPONSE_TOKEN_LIMIT = 5000;
const INSTRUCTIONS = `
You are a engineering bot that helps users with technical questions.
Do not accept big coding snippets, only small ones, like a method or library etc.
All code responses has to be small snippets of example.
Always keep your answers short and to the point.
Do not answer messages if they include passwords, client secrets or anything sensitive to a application.
Do not answer messages that include personal information.
Do not answer messages that include any form of religious content.
Do not answer messages that include any form of political content.
Always keep your answers under ${RESPONSE_TOKEN_LIMIT} tokens. 
If you judge that the answer will exceed the limit, prioritize the 3-5 most critical points and omit the rest.
Use continuous prose with short sentences.
Format every code snippet inside fenced code blocks, including a language identifier when known, so it reads like code in an IDE.
End at a complete sentence.`;

type ChatResponse = {
   id: string;
   message: string;
};

// Public interface
export const chatService = {
   async sendMessage(
      prompt: string,
      userId: string,
      conversationId: string
   ): Promise<ChatResponse> {
      const response = await client.responses.create({
         model: 'gpt-4o-mini',
         instructions: INSTRUCTIONS,
         input: prompt,
         temperature: 0.2,
         max_output_tokens: RESPONSE_TOKEN_LIMIT,
         previous_response_id:
            conversationRepository.getLastResponseId(userId, conversationId) ||
            undefined,
      });

      conversationRepository.setLastResponseId(
         userId,
         conversationId,
         response.id
      );

      return {
         id: response.id,
         message: response.output_text,
      };
   },
};
