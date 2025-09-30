import { useCallback, useEffect, useState } from 'react';

import {
   ChatRequestError,
   createConversation,
   deleteConversation as deleteConversationRequest,
   getConversation,
   listConversations,
   sendChatMessage,
   updateConversation,
} from '@/lib/chat-client';
import {
   createProject as createProjectApi,
   deleteProject as deleteProjectApi,
   listProjects,
   renameProject as renameProjectApi,
} from '@/lib/project-client';
import { createId } from '@/lib/id';
import type {
   ChatConversation,
   ChatConversationDetail,
   ChatMessage,
} from '@/types/chat';
import type { ChatProject } from '@/types/project';

type UseChatReturn = {
   conversations: ChatConversation[];
   projects: ChatProject[];
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
   createProject: (name: string) => Promise<ChatProject>;
   renameProject: (projectId: string, name: string) => Promise<void>;
   deleteProject: (projectId: string) => Promise<void>;
   assignConversationToProject: (
      conversationId: string,
      projectId: string | null
   ) => Promise<void>;
   renameConversation: (conversationId: string, title: string) => Promise<void>;
   resetChat: () => Promise<void>;
};

const DEFAULT_CONVERSATION_TITLE = 'New chat';

function toConversationSummary(
   conversation: ChatConversation | ChatConversationDetail
): ChatConversation {
   const { id, title, createdAt, updatedAt, messageCount, projectId } =
      conversation;

   return {
      id,
      title,
      createdAt,
      updatedAt,
      messageCount,
      projectId,
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

function sortProjectsByUpdatedAt(projects: ChatProject[]) {
   return [...projects].sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
   );
}

export function useChat(): UseChatReturn {
   const [conversations, setConversations] = useState<ChatConversation[]>([]);
   const [projects, setProjects] = useState<ChatProject[]>([]);
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
            const [projectList, conversationList] = await Promise.all([
               listProjects(),
               listConversations(),
            ]);
            if (cancelled) {
               return;
            }

            setProjects(projectList);

            if (conversationList.length === 0) {
               const conversation = await createConversation();
               if (cancelled) {
                  return;
               }

               setConversations([conversation]);
               setActiveConversationId(conversation.id);
               setMessagesMap({ [conversation.id]: [] });
               setErrors({ [conversation.id]: null });
            } else {
               setConversations(conversationList);
               setActiveConversationId(
                  (current) => current ?? conversationList[0]?.id ?? null
               );
               setMessagesMap((prev) => {
                  const next = { ...prev };
                  for (const conversation of conversationList) {
                     if (!next[conversation.id]) {
                        next[conversation.id] = [];
                     }
                  }
                  return next;
               });
               setErrors((prev) => {
                  const next = { ...prev };
                  for (const conversation of conversationList) {
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
            setProjects([]);
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
               projectId: current?.projectId ?? null,
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

         const target = conversations.find(
            (conversation) => conversation.id === conversationId
         );

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

            if (target?.projectId) {
               setProjects((prev) =>
                  prev.map((project) =>
                     project.id === target.projectId
                        ? {
                             ...project,
                             conversationCount: Math.max(
                                project.conversationCount - 1,
                                0
                             ),
                          }
                        : project
                  )
               );
            }

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
      [activeConversationId, conversations, selectConversation]
   );

   const createProject = useCallback(async (name: string) => {
      try {
         const project = await createProjectApi(name);
         setProjects((prev) => sortProjectsByUpdatedAt([project, ...prev]));
         setGlobalError(null);
         return project;
      } catch (error) {
         const message =
            error instanceof ChatRequestError
               ? error.message
               : error instanceof Error
                 ? error.message
                 : 'Failed to create project.';
         setGlobalError(message);
         throw error;
      }
   }, []);

   const renameProject = useCallback(
      async (projectId: string, name: string) => {
         try {
            const project = await renameProjectApi(projectId, name);
            setProjects((prev) =>
               sortProjectsByUpdatedAt(
                  prev.map((item) => (item.id === project.id ? project : item))
               )
            );
            setGlobalError(null);
         } catch (error) {
            const message =
               error instanceof ChatRequestError
                  ? error.message
                  : error instanceof Error
                    ? error.message
                    : 'Failed to rename project.';
            setGlobalError(message);
            throw error;
         }
      },
      []
   );

   const deleteProject = useCallback(
      async (projectId: string) => {
         if (!projectId) {
            return;
         }

         try {
            await deleteProjectApi(projectId);

            const removedConversationIds: string[] = [];
            let nextActiveId: string | null = activeConversationId;

            setConversations((prev) => {
               const next = prev.filter((conversation) => {
                  const shouldRemove = conversation.projectId === projectId;

                  if (shouldRemove) {
                     removedConversationIds.push(conversation.id);
                  }

                  return !shouldRemove;
               });

               if (
                  removedConversationIds.includes(activeConversationId ?? '')
               ) {
                  nextActiveId = next[0]?.id ?? null;
               }

               return next;
            });

            setMessagesMap((prev) => {
               const next = { ...prev };
               for (const id of removedConversationIds) {
                  delete next[id];
               }
               return next;
            });

            setErrors((prev) => {
               const next = { ...prev };
               for (const id of removedConversationIds) {
                  delete next[id];
               }
               return next;
            });

            setProjects((prev) =>
               prev.filter((project) => project.id !== projectId)
            );

            if (removedConversationIds.includes(activeConversationId ?? '')) {
               if (nextActiveId) {
                  selectConversation(nextActiveId);
               } else {
                  setActiveConversationId(null);
               }
            }

            setGlobalError(null);
         } catch (error) {
            const message =
               error instanceof ChatRequestError
                  ? error.message
                  : error instanceof Error
                    ? error.message
                    : 'Failed to delete project.';
            setGlobalError(message);
            throw error;
         }
      },
      [activeConversationId, selectConversation]
   );

   const assignConversationToProject = useCallback(
      async (conversationId: string, projectId: string | null) => {
         if (!conversationId) {
            return;
         }

         let previousProjectId: string | null = null;

         try {
            const conversation = await updateConversation(conversationId, {
               projectId,
            });

            setConversations((prev) =>
               promoteConversation(prev, conversation.id, (current) => {
                  previousProjectId = current?.projectId ?? null;
                  return conversation;
               })
            );

            if (previousProjectId || conversation.projectId) {
               setProjects((prev) =>
                  sortProjectsByUpdatedAt(
                     prev.map((project) => {
                        if (
                           project.id === previousProjectId &&
                           previousProjectId !== conversation.projectId
                        ) {
                           return {
                              ...project,
                              conversationCount: Math.max(
                                 project.conversationCount - 1,
                                 0
                              ),
                           };
                        }

                        if (
                           project.id === conversation.projectId &&
                           previousProjectId !== conversation.projectId
                        ) {
                           return {
                              ...project,
                              conversationCount: project.conversationCount + 1,
                           };
                        }

                        return project;
                     })
                  )
               );
            }

            setGlobalError(null);
         } catch (error) {
            const message =
               error instanceof ChatRequestError
                  ? error.message
                  : error instanceof Error
                    ? error.message
                    : 'Failed to update conversation.';
            setGlobalError(message);
            throw error;
         }
      },
      []
   );

   const renameConversation = useCallback(
      async (conversationId: string, title: string) => {
         const trimmed = title.trim();

         if (!trimmed) {
            return;
         }

         try {
            const conversation = await updateConversation(conversationId, {
               title: trimmed,
            });

            setConversations((prev) =>
               promoteConversation(prev, conversation.id, () => conversation)
            );

            setGlobalError(null);
         } catch (error) {
            const message =
               error instanceof ChatRequestError
                  ? error.message
                  : error instanceof Error
                    ? error.message
                    : 'Failed to rename conversation.';
            setGlobalError(message);
            throw error;
         }
      },
      []
   );

   const resetChat = useCallback(
      () => startNewConversation(),
      [startNewConversation]
   );

   return {
      conversations,
      projects,
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
      createProject,
      renameProject,
      deleteProject,
      assignConversationToProject,
      renameConversation,
      resetChat,
   };
}
