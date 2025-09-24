import OpenAI from 'openai';
import { conversationRepository } from '../repositories/conversation.repository';

// Implementation detail
const client = new OpenAI({
   apiKey: process.env.OPENAI_API_KEY,
});

const RESPONSE_TOKEN_LIMIT = 200;
const INSTRUCTIONS = `Respond in plain text (no Markdown, no lists, no headings).
Use continuous prose with short sentences.
Aim for ${RESPONSE_TOKEN_LIMIT} tokens. 
If you judge that the answer will exceed the limit, prioritize the 3 – 5 most critical points and omit the rest.
End at a complete sentence.`;

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
