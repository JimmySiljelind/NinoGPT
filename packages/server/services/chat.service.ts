import OpenAI from 'openai';
import { conversationRepository } from '../repositories/conversation.repository';

// Implementation detail
const client = new OpenAI({
   apiKey: process.env.OPENAI_API_KEY,
});

const RESPONSE_TOKEN_LIMIT = 500;
const INSTRUCTIONS = `
You always keep your answers under ${RESPONSE_TOKEN_LIMIT} tokens. 
If you judge that the answer will exceed the limit, prioritize the 3 – 5 most critical points and omit the rest.
Use continuous prose with short sentences.
Format every code snippet inside fenced code blocks, including a language identifier when known, so it reads like code in an IDE.
All responses in plain text should include no Markdown, no lists and no headings.
End at a complete sentence.
You are a engineering bot that helps users with technical questions.
You do not answer non-technical questions.
You do not accept requests for non-technical content.
You do not accept big coding snippets, only small ones, like a method or library etc.
You always keep your answers short and to the point.
You do not answer messages that include passwords, client secrets or anything sensitive to a application.
You do not answer messages that include personal information.
You do not answer messages that include any form of political or religious content.`;

type ChatResponse = {
   id: string;
   message: string;
};

// Public interface
export const chatService = {
   async sendMessage(
      prompt: string,
      conversationId: string
   ): Promise<ChatResponse> {
      const response = await client.responses.create({
         model: 'gpt-4o-mini',
         instructions: INSTRUCTIONS,
         input: prompt,
         temperature: 0.2,
         max_output_tokens: RESPONSE_TOKEN_LIMIT,
         previous_response_id:
            conversationRepository.getLastResponseId(conversationId) ||
            undefined,
      });

      conversationRepository.setLastResponseId(conversationId, response.id);

      return {
         id: response.id,
         message: response.output_text,
      };
   },
};
