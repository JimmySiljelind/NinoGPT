import { useCallback, useEffect, useState } from 'react';

import {
   ChatRequestError,
   createConversation,
   deleteConversation as deleteConversationRequest,
   getConversation,
   listConversations,
   sendChatMessage,
} from '@/lib/chat-client';
import { createId } from '@/lib/id';
import type {
   ChatConversation,
   ChatConversationDetail,
   ChatMessage,
} from '@/types/chat';

type UseChatReturn = {
   conversations: ChatConversation[];
   activeConversationId: string | null;
   messages: ChatMessage[];
   isSending: boolean;
   isLoadingConversations: boolean;
   error: string | null;
   globalError: string | null;
   sendMessage: (input: string) => Promise<void>;
   selectConversation: (conversationId: string) => void;
   startNewConversation: () => Promise<void>;
   deleteConversation: (conversationId: string) => Promise<void>;
   resetChat: () => Promise<void>;
};

const DEFAULT_CONVERSATION_TITLE = 'New chat';

function toConversationSummary(
   conversation: ChatConversation | ChatConversationDetail
): ChatConversation {
   const { id, title, createdAt, updatedAt, messageCount } = conversation;

   return {
      id,
      title,
      createdAt,
      updatedAt,
      messageCount,
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
   updater: (conversation: ChatConversation | null) => ChatConversation
) {
   const existing = list.find((item) => item.id === conversationId) ?? null;
   const updated = updater(existing);
   const rest = list.filter((item) => item.id !== conversationId);

   return [updated, ...rest];
}

export function useChat(): UseChatReturn {
   const [conversations, setConversations] = useState<ChatConversation[]>([]);
   const [activeConversationId, setActiveConversationId] = useState<
      string | null
   >(null);
   const [messagesMap, setMessagesMap] = useState<
      Record<string, ChatMessage[]>
   >({});
   const [errors, setErrors] = useState<Record<string, string | null>>({});
   const [globalError, setGlobalError] = useState<string | null>(null);
   const [isSending, setIsSending] = useState(false);
   const [isLoadingConversations, setIsLoadingConversations] = useState(true);

   const messages = activeConversationId
      ? (messagesMap[activeConversationId] ?? [])
      : [];
   const error = activeConversationId
      ? (errors[activeConversationId] ?? null)
      : null;

   const ensureConversationState = useCallback((conversationId: string) => {
      setMessagesMap((prev) => {
         if (prev[conversationId]) {
            return prev;
         }

         return {
            ...prev,
            [conversationId]: [],
         };
      });

      setErrors((prev) => {
         if (conversationId in prev) {
            return prev;
         }

         return {
            ...prev,
            [conversationId]: null,
         };
      });
   }, []);

   useEffect(() => {
      let cancelled = false;

      async function bootstrap() {
         setIsLoadingConversations(true);

         try {
            const list = await listConversations();
            if (cancelled) {
               return;
            }

            if (list.length === 0) {
               const conversation = await createConversation();
               if (cancelled) {
                  return;
               }

               setConversations([conversation]);
               setActiveConversationId(conversation.id);
               setMessagesMap({ [conversation.id]: [] });
               setErrors({ [conversation.id]: null });
            } else {
               setConversations(list);
               setActiveConversationId(
                  (current) => current ?? list[0]?.id ?? null
               );
               setMessagesMap((prev) => {
                  const next = { ...prev };
                  for (const conversation of list) {
                     if (!next[conversation.id]) {
                        next[conversation.id] = [];
                     }
                  }
                  return next;
               });
               setErrors((prev) => {
                  const next = { ...prev };
                  for (const conversation of list) {
                     if (!(conversation.id in next)) {
                        next[conversation.id] = null;
                     }
                  }
                  return next;
               });
            }

            setGlobalError(null);
         } catch (error) {
            if (cancelled) {
               return;
            }

            const message =
               error instanceof Error
                  ? error.message
                  : 'Failed to load conversations.';
            setConversations([]);
            setActiveConversationId(null);
            setMessagesMap({});
            setErrors({});
            setGlobalError(message);
         } finally {
            if (!cancelled) {
               setIsLoadingConversations(false);
            }
         }
      }

      void bootstrap();

      return () => {
         cancelled = true;
      };
   }, []);

   useEffect(() => {
      if (!activeConversationId || isLoadingConversations) {
         return;
      }

      const conversationId = activeConversationId;

      ensureConversationState(conversationId);

      const summary = conversations.find(
         (conversation) => conversation.id === conversationId
      );

      const hasMessages = (messagesMap[conversationId] ?? []).length > 0;

      if (!summary || summary.messageCount === 0 || hasMessages) {
         return;
      }

      let cancelled = false;

      async function loadConversation() {
         try {
            const detail = await getConversation(conversationId);
            if (cancelled) {
               return;
            }

            setMessagesMap((prev) => ({
               ...prev,
               [detail.id]: detail.messages,
            }));

            setConversations((prev) =>
               promoteConversation(prev, detail.id, () =>
                  toConversationSummary(detail)
               )
            );

            setErrors((prev) => ({ ...prev, [detail.id]: null }));
         } catch (error) {
            if (cancelled) {
               return;
            }

            const message =
               error instanceof Error
                  ? error.message
                  : 'Failed to load conversation.';

            setErrors((prev) => ({
               ...prev,
               [conversationId]: message,
            }));
         }
      }

      void loadConversation();

      return () => {
         cancelled = true;
      };
   }, [
      activeConversationId,
      conversations,
      ensureConversationState,
      isLoadingConversations,
      messagesMap,
   ]);

   const selectConversation = useCallback(
      (conversationId: string) => {
         ensureConversationState(conversationId);
         setActiveConversationId(conversationId);
         setGlobalError(null);
      },
      [ensureConversationState]
   );

   const startNewConversation = useCallback(async () => {
      try {
         const conversation = await createConversation();

         setConversations((prev) =>
            promoteConversation(prev, conversation.id, () => conversation)
         );
         setMessagesMap((prev) => ({ ...prev, [conversation.id]: [] }));
         setErrors((prev) => ({ ...prev, [conversation.id]: null }));
         setActiveConversationId(conversation.id);
         setGlobalError(null);
      } catch (error) {
         const message =
            error instanceof Error
               ? error.message
               : 'Failed to create conversation.';
         setGlobalError(message);
      }
   }, []);

   const sendMessage = useCallback(
      async (input: string) => {
         const trimmed = input.trim();

         if (
            !trimmed ||
            isSending ||
            !activeConversationId ||
            isLoadingConversations
         ) {
            return;
         }

         const conversationId = activeConversationId;

         ensureConversationState(conversationId);

         const now = new Date();
         const userMessage: ChatMessage = {
            id: createId(),
            role: 'user',
            content: trimmed,
            createdAt: now,
         };

         setMessagesMap((prev) => ({
            ...prev,
            [conversationId]: [...(prev[conversationId] ?? []), userMessage],
         }));

         setIsSending(true);
         setErrors((prev) => ({ ...prev, [conversationId]: null }));
         setGlobalError(null);

         setConversations((prev) =>
            promoteConversation(prev, conversationId, (current) => ({
               id: current?.id ?? conversationId,
               title: deriveTitle(
                  current?.title ?? DEFAULT_CONVERSATION_TITLE,
                  trimmed
               ),
               createdAt: current?.createdAt ?? now,
               updatedAt: now,
               messageCount: (current?.messageCount ?? 0) + 1,
            }))
         );

         try {
            const conversation = await sendChatMessage({
               prompt: trimmed,
               conversationId,
            });

            setMessagesMap((prev) => ({
               ...prev,
               [conversation.id]: conversation.messages,
            }));

            setConversations((prev) =>
               promoteConversation(prev, conversation.id, () =>
                  toConversationSummary(conversation)
               )
            );

            setErrors((prev) => ({ ...prev, [conversation.id]: null }));
         } catch (error) {
            let message = 'Unexpected error';
            let conversation: ChatConversationDetail | undefined;

            if (error instanceof ChatRequestError) {
               message = error.message;
               conversation = error.conversation;
            } else if (error instanceof Error) {
               message = error.message;
            }

            const fallbackMessage: ChatMessage = {
               id: createId(),
               role: 'system',
               content:
                  message ||
                  'Something went wrong while sending your message. Please try again.',
               createdAt: new Date(),
            };

            if (conversation) {
               setMessagesMap((prev) => ({
                  ...prev,
                  [conversation.id]: [
                     ...conversation.messages,
                     fallbackMessage,
                  ],
               }));

               setConversations((prev) =>
                  promoteConversation(prev, conversation.id, () =>
                     toConversationSummary(conversation)
                  )
               );
            } else {
               setMessagesMap((prev) => ({
                  ...prev,
                  [conversationId]: [
                     ...(prev[conversationId] ?? []),
                     fallbackMessage,
                  ],
               }));
            }

            setErrors((prev) => ({
               ...prev,
               [conversationId]: message,
            }));
         } finally {
            setIsSending(false);
         }
      },
      [
         activeConversationId,
         ensureConversationState,
         isLoadingConversations,
         isSending,
      ]
   );

   const deleteConversation = useCallback(
      async (conversationId: string) => {
         if (!conversationId) {
            return;
         }

         try {
            await deleteConversationRequest(conversationId);

            let nextActiveId: string | null = null;

            setConversations((prev) => {
               const next = prev.filter((item) => item.id !== conversationId);

               if (activeConversationId === conversationId) {
                  nextActiveId = next[0]?.id ?? null;
               }

               return next;
            });

            setMessagesMap((prev) => {
               const { [conversationId]: _removed, ...rest } = prev;
               return rest;
            });

            setErrors((prev) => {
               const { [conversationId]: _removed, ...rest } = prev;
               return rest;
            });

            setGlobalError(null);

            if (activeConversationId === conversationId) {
               if (nextActiveId) {
                  selectConversation(nextActiveId);
               } else {
                  setActiveConversationId(null);
               }
            }
         } catch (error) {
            const message =
               error instanceof ChatRequestError
                  ? error.message
                  : error instanceof Error
                    ? error.message
                    : 'Failed to delete conversation.';

            setGlobalError(message);
            setErrors((prev) => ({ ...prev, [conversationId]: message }));

            throw error;
         }
      },
      [activeConversationId, selectConversation]
   );

   const resetChat = useCallback(
      () => startNewConversation(),
      [startNewConversation]
   );

   return {
      conversations,
      activeConversationId,
      messages,
      isSending,
      isLoadingConversations,
      error,
      globalError,
      sendMessage,
      selectConversation,
      startNewConversation,
      deleteConversation,
      resetChat,
   };
}
