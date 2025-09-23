import { createId } from './id';

type ChatPayload = {
   prompt: string;
   conversationId?: string | null;
};

type ApiChatResponse = {
   message: string;
   conversationId: string;
};

const API_MODE = (import.meta.env.VITE_CHAT_API_MODE ?? 'mock') as
   | 'api'
   | 'mock';
const API_ENDPOINT = '/api/chat';

export async function sendChatMessage(
   payload: ChatPayload
): Promise<ApiChatResponse> {
   const normalizedPayload: ChatPayload = {
      prompt: payload.prompt,
      conversationId: payload.conversationId ?? undefined,
   };

   if (API_MODE === 'api') {
      const response = await fetch(API_ENDPOINT, {
         method: 'POST',
         headers: {
            'Content-Type': 'application/json',
         },
         body: JSON.stringify(normalizedPayload),
      });

      if (!response.ok) {
         let detail = 'Failed to send message.';
         try {
            const data = (await response.json()) as {
               error?: string;
               errors?: unknown;
            };
            detail = data?.error ?? detail;
         } catch (error) {
            // ignore JSON parsing issues and keep default detail
         }
         throw new Error(detail);
      }

      const data = (await response.json()) as ApiChatResponse;
      return data;
   }

   return mockChatResponse(normalizedPayload);
}

async function mockChatResponse(
   payload: ChatPayload
): Promise<ApiChatResponse> {
   const conversationId = payload.conversationId ?? createId();

   return new Promise((resolve) => {
      setTimeout(() => {
         resolve({
            conversationId,
            message: `This is a preview response for: "${payload.prompt}"`,
         });
      }, 450);
   });
}
