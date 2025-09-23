import { useCallback, useState } from 'react';

import { sendChatMessage } from '@/lib/chat-client';
import { createId } from '@/lib/id';
import type { ChatMessage } from '@/types/chat';

type UseChatReturn = {
   messages: ChatMessage[];
   conversationId: string | null;
   isSending: boolean;
   error: string | null;
   sendMessage: (input: string) => Promise<void>;
   resetChat: () => void;
};

export function useChat(): UseChatReturn {
   const [messages, setMessages] = useState<ChatMessage[]>([]);
   const [conversationId, setConversationId] = useState<string | null>(null);
   const [isSending, setIsSending] = useState(false);
   const [error, setError] = useState<string | null>(null);

   const resetChat = useCallback(() => {
      setMessages([]);
      setConversationId(null);
      setError(null);
   }, []);

   const sendMessage = useCallback(
      async (input: string) => {
         const trimmed = input.trim();
         if (!trimmed || isSending) {
            return;
         }

         const userMessage: ChatMessage = {
            id: createId(),
            role: 'user',
            content: trimmed,
            createdAt: new Date(),
         };

         setMessages((prev) => [...prev, userMessage]);
         setIsSending(true);
         setError(null);

         try {
            const response = await sendChatMessage({
               prompt: trimmed,
               conversationId,
            });

            setConversationId(response.conversationId);

            const assistantMessage: ChatMessage = {
               id: createId(),
               role: 'assistant',
               content: response.message,
               createdAt: new Date(),
            };

            setMessages((prev) => [...prev, assistantMessage]);
         } catch (error) {
            const fallbackMessage: ChatMessage = {
               id: createId(),
               role: 'system',
               content:
                  'Something went wrong while sending your message. Please try again.',
               createdAt: new Date(),
            };

            setMessages((prev) => [...prev, fallbackMessage]);

            if (error instanceof Error) {
               setError(error.message);
            } else {
               setError('Unexpected error');
            }
         } finally {
            setIsSending(false);
         }
      },
      [conversationId, isSending]
   );

   return {
      messages,
      conversationId,
      isSending,
      error,
      sendMessage,
      resetChat,
   };
}
