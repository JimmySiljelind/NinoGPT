import { useCallback, useMemo, useState } from 'react';

import { sendChatMessage } from '@/lib/chat-client';
import { createId } from '@/lib/id';
import type { ChatConversation, ChatMessage } from '@/types/chat';

type UseChatReturn = {
   conversations: ChatConversation[];
   activeConversationId: string;
   messages: ChatMessage[];
   isSending: boolean;
   error: string | null;
   sendMessage: (input: string) => Promise<void>;
   selectConversation: (conversationId: string) => void;
   startNewConversation: () => void;
   resetChat: () => void;
};

const DEFAULT_CONVERSATION_TITLE = 'New chat';

function createConversation(): ChatConversation {
   const now = new Date();
   return {
      id: createId(),
      title: DEFAULT_CONVERSATION_TITLE,
      createdAt: now,
      updatedAt: now,
      remoteId: null,
   };
}

function deriveTitle(currentTitle: string, latestPrompt: string) {
   if (currentTitle && currentTitle !== DEFAULT_CONVERSATION_TITLE) {
      return currentTitle;
   }

   const trimmed = latestPrompt.trim();
   if (!trimmed) {
      return DEFAULT_CONVERSATION_TITLE;
   }

   return trimmed.length > 48 ? `${trimmed.slice(0, 45)}...` : trimmed;
}

function promoteConversation(
   list: ChatConversation[],
   conversationId: string,
   updater: (conversation: ChatConversation) => ChatConversation
) {
   const conversation = list.find((item) => item.id === conversationId);

   if (!conversation) {
      return list;
   }

   const rest = list.filter((item) => item.id !== conversationId);
   return [updater(conversation), ...rest];
}

export function useChat(): UseChatReturn {
   const initialConversation = useMemo(() => createConversation(), []);

   const [conversations, setConversations] = useState<ChatConversation[]>(
      () => [initialConversation]
   );
   const [activeConversationId, setActiveConversationId] = useState(
      initialConversation.id
   );
   const [messagesMap, setMessagesMap] = useState<
      Record<string, ChatMessage[]>
   >({
      [initialConversation.id]: [],
   });
   const [errors, setErrors] = useState<Record<string, string | null>>({
      [initialConversation.id]: null,
   });
   const [isSending, setIsSending] = useState(false);

   const messages = messagesMap[activeConversationId] ?? [];
   const error = errors[activeConversationId] ?? null;

   const ensureConversationStore = useCallback((conversationId: string) => {
      setMessagesMap((prev) => {
         if (Object.prototype.hasOwnProperty.call(prev, conversationId)) {
            return prev;
         }

         return {
            ...prev,
            [conversationId]: [],
         };
      });

      setErrors((prev) => {
         if (Object.prototype.hasOwnProperty.call(prev, conversationId)) {
            return prev;
         }

         return {
            ...prev,
            [conversationId]: null,
         };
      });
   }, []);

   const selectConversation = useCallback(
      (conversationId: string) => {
         ensureConversationStore(conversationId);
         setActiveConversationId(conversationId);
      },
      [ensureConversationStore]
   );

   const startNewConversation = useCallback(() => {
      const conversation = createConversation();
      setConversations((prev) => [conversation, ...prev]);
      setMessagesMap((prev) => ({ ...prev, [conversation.id]: [] }));
      setErrors((prev) => ({ ...prev, [conversation.id]: null }));
      setActiveConversationId(conversation.id);
   }, []);

   const sendMessage = useCallback(
      async (input: string) => {
         const trimmed = input.trim();
         if (!trimmed || isSending) {
            return;
         }

         const conversation = conversations.find(
            (item) => item.id === activeConversationId
         );

         if (!conversation) {
            return;
         }

         const now = new Date();

         const userMessage: ChatMessage = {
            id: createId(),
            role: 'user',
            content: trimmed,
            createdAt: now,
         };

         setMessagesMap((prev) => {
            const previousMessages = prev[activeConversationId] ?? [];
            return {
               ...prev,
               [activeConversationId]: [...previousMessages, userMessage],
            };
         });

         setIsSending(true);
         setErrors((prev) => ({ ...prev, [activeConversationId]: null }));
         setConversations((prev) =>
            promoteConversation(prev, activeConversationId, (current) => ({
               ...current,
               title: deriveTitle(current.title, trimmed),
               updatedAt: now,
            }))
         );

         try {
            const response = await sendChatMessage({
               prompt: trimmed,
               conversationId: conversation.remoteId ?? undefined,
            });

            const assistantMessage: ChatMessage = {
               id: createId(),
               role: 'assistant',
               content: response.message,
               createdAt: new Date(),
            };

            setMessagesMap((prev) => {
               const previousMessages = prev[activeConversationId] ?? [];
               return {
                  ...prev,
                  [activeConversationId]: [
                     ...previousMessages,
                     assistantMessage,
                  ],
               };
            });

            setConversations((prev) =>
               promoteConversation(prev, activeConversationId, (current) => ({
                  ...current,
                  title: deriveTitle(current.title, trimmed),
                  updatedAt: new Date(),
                  remoteId: response.conversationId,
               }))
            );
         } catch (error) {
            const fallbackMessage: ChatMessage = {
               id: createId(),
               role: 'system',
               content:
                  'Something went wrong while sending your message. Please try again.',
               createdAt: new Date(),
            };

            setMessagesMap((prev) => {
               const previousMessages = prev[activeConversationId] ?? [];
               return {
                  ...prev,
                  [activeConversationId]: [
                     ...previousMessages,
                     fallbackMessage,
                  ],
               };
            });

            setErrors((prev) => ({
               ...prev,
               [activeConversationId]:
                  error instanceof Error ? error.message : 'Unexpected error',
            }));

            setConversations((prev) =>
               promoteConversation(prev, activeConversationId, (current) => ({
                  ...current,
                  updatedAt: new Date(),
               }))
            );
         } finally {
            setIsSending(false);
         }
      },
      [activeConversationId, conversations, isSending]
   );

   const resetChat = startNewConversation;

   return {
      conversations,
      activeConversationId,
      messages,
      isSending,
      error,
      sendMessage,
      selectConversation,
      startNewConversation,
      resetChat,
   };
}
