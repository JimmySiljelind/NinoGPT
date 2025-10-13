import { useCallback, useEffect, useState } from 'react';

import {
   ChatRequestError,
   createConversation,
   archiveConversation as archiveConversationRequest,
   deleteAllConversations as deleteAllConversationsRequest,
   deleteConversation as deleteConversationRequest,
   deleteArchivedConversations as deleteArchivedConversationsRequest,
   generateImageMessage,
   getConversation,
   listArchivedConversations,
   listConversations,
   sendChatMessage,
   unarchiveConversation as unarchiveConversationRequest,
   updateConversation,
} from '@/lib/chat-client';
import {
   createProject as createProjectApi,
   deleteAllProjects as deleteAllProjectsRequest,
   deleteProject as deleteProjectApi,
   listProjects,
   renameProject as renameProjectApi,
} from '@/lib/project-client';
import { createId } from '@/lib/id';
import {
   DEFAULT_IMAGE_CONVERSATION_TITLE,
   DEFAULT_TEXT_CONVERSATION_TITLE,
   type ChatConversation,
   type ChatConversationDetail,
   type ChatConversationType,
   type ChatMessage,
} from '@/types/chat';
import type { ChatProject } from '@/types/project';

type UseChatReturn = {
   conversations: ChatConversation[];
   archivedConversations: ChatConversation[];
   projects: ChatProject[];
   activeConversationId: string | null;
   messages: ChatMessage[];
   isSending: boolean;
   isLoadingConversations: boolean;
   isLoadingArchived: boolean;
   error: string | null;
   globalError: string | null;
   sendMessage: (input: string) => Promise<void>;
   selectConversation: (conversationId: string) => void;
   startNewConversation: (type?: ChatConversationType) => Promise<void>;
   deleteConversation: (conversationId: string) => Promise<void>;
   archiveConversation: (conversationId: string) => Promise<void>;
   unarchiveConversation: (conversationId: string) => Promise<void>;
   createProject: (name: string) => Promise<ChatProject>;
   renameProject: (projectId: string, name: string) => Promise<void>;
   deleteProject: (projectId: string) => Promise<void>;
   deleteAllConversations: () => Promise<number>;
   deleteArchivedConversations: () => Promise<number>;
   deleteAllProjects: () => Promise<number>;
   loadArchivedConversations: () => Promise<void>;
   assignConversationToProject: (
      conversationId: string,
      projectId: string | null
   ) => Promise<void>;
   renameConversation: (conversationId: string, title: string) => Promise<void>;
   resetChat: () => Promise<void>;
};

function toConversationSummary(
   conversation: ChatConversation | ChatConversationDetail
): ChatConversation {
   const {
      id,
      title,
      type,
      createdAt,
      updatedAt,
      messageCount,
      projectId,
      archivedAt,
   } = conversation;

   return {
      id,
      title,
      type,
      createdAt,
      updatedAt,
      messageCount,
      projectId,
      archivedAt: archivedAt ?? null,
   };
}

function getDefaultTitleForType(type: ChatConversationType) {
   return type === 'image'
      ? DEFAULT_IMAGE_CONVERSATION_TITLE
      : DEFAULT_TEXT_CONVERSATION_TITLE;
}

function deriveTitle(
   currentTitle: string,
   latestPrompt: string,
   type: ChatConversationType
) {
   const defaultTitle = getDefaultTitleForType(type);

   if (currentTitle && currentTitle !== defaultTitle) {
      return currentTitle;
   }

   const trimmed = latestPrompt.trim();
   if (!trimmed) {
      return defaultTitle;
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
   const [archivedConversations, setArchivedConversations] = useState<
      ChatConversation[]
   >([]);
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
   const [isLoadingArchived, setIsLoadingArchived] = useState(false);

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

   const loadArchivedConversations = useCallback(async () => {
      setIsLoadingArchived(true);

      try {
         const archived = await listArchivedConversations();
         setArchivedConversations(archived);
         setGlobalError(null);
      } catch (error) {
         const message =
            error instanceof ChatRequestError
               ? error.message
               : error instanceof Error
                 ? error.message
                 : 'Failed to load archived conversations.';
         setGlobalError(message);
         throw error;
      } finally {
         setIsLoadingArchived(false);
      }
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
            setArchivedConversations([]);
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

   const startNewConversation = useCallback(
      async (type: ChatConversationType = 'text') => {
         try {
            const conversation = await createConversation({ type });

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
      },
      []
   );

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

         const activeConversationSummary =
            conversations.find((item) => item.id === conversationId) ?? null;
         const conversationType: ChatConversationType =
            activeConversationSummary?.type ?? 'text';
         const defaultTitle = getDefaultTitleForType(conversationType);

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
                  current?.title ?? defaultTitle,
                  trimmed,
                  current?.type ?? conversationType
               ),
               type: current?.type ?? conversationType,
               createdAt: current?.createdAt ?? now,
               updatedAt: now,
               messageCount: (current?.messageCount ?? 0) + 1,
               projectId: current?.projectId ?? null,
               archivedAt: current?.archivedAt ?? null,
            }))
         );

         try {
            const updatedConversation =
               conversationType === 'image'
                  ? await generateImageMessage({
                       prompt: trimmed,
                       conversationId,
                    })
                  : await sendChatMessage({
                       prompt: trimmed,
                       conversationId,
                    });

            setMessagesMap((prev) => ({
               ...prev,
               [updatedConversation.id]: updatedConversation.messages,
            }));

            setConversations((prev) =>
               promoteConversation(prev, updatedConversation.id, () =>
                  toConversationSummary(updatedConversation)
               )
            );

            setErrors((prev) => ({
               ...prev,
               [updatedConversation.id]: null,
            }));
         } catch (error) {
            const defaultErrorMessage =
               conversationType === 'image'
                  ? 'Failed to generate image.'
                  : 'Failed to send message.';
            let message = defaultErrorMessage;
            let failedConversation: ChatConversationDetail | undefined;

            if (error instanceof ChatRequestError) {
               message = error.message || defaultErrorMessage;
               failedConversation = error.conversation;
            } else if (error instanceof Error && error.message) {
               message = error.message;
            }

            const fallbackContent =
               message ||
               (conversationType === 'image'
                  ? 'Something went wrong while generating your image. Please try again.'
                  : 'Something went wrong while sending your message. Please try again.');

            const fallbackMessage: ChatMessage = {
               id: createId(),
               role: 'system',
               content: fallbackContent,
               createdAt: new Date(),
            };

            if (failedConversation) {
               setMessagesMap((prev) => ({
                  ...prev,
                  [failedConversation.id]: [
                     ...failedConversation.messages,
                     fallbackMessage,
                  ],
               }));

               setConversations((prev) =>
                  promoteConversation(prev, failedConversation.id, () =>
                     toConversationSummary(failedConversation)
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
         conversations,
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

         const target =
            conversations.find(
               (conversation) => conversation.id === conversationId
            ) ??
            archivedConversations.find(
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

            setArchivedConversations((prev) =>
               prev.filter((item) => item.id !== conversationId)
            );

            setMessagesMap((prev) => {
               if (!(conversationId in prev)) {
                  return prev;
               }

               const next = { ...prev };
               delete next[conversationId];
               return next;
            });

            setErrors((prev) => {
               if (!(conversationId in prev)) {
                  return prev;
               }

               const next = { ...prev };
               delete next[conversationId];
               return next;
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
      [
         activeConversationId,
         archivedConversations,
         conversations,
         selectConversation,
      ]
   );

   const archiveConversation = useCallback(
      async (conversationId: string) => {
         if (!conversationId) {
            return;
         }

         let nextActiveId: string | null = null;
         const previousProjectId =
            conversations.find(
               (conversation) => conversation.id === conversationId
            )?.projectId ?? null;

         try {
            const archived = await archiveConversationRequest(conversationId);

            setConversations((prev) => {
               const next = prev.filter((item) => item.id !== conversationId);

               if (activeConversationId === conversationId) {
                  nextActiveId = next[0]?.id ?? null;
               }

               return next;
            });

            setArchivedConversations((prev) => [
               archived,
               ...prev.filter((item) => item.id !== conversationId),
            ]);

            setMessagesMap((prev) => {
               if (!(conversationId in prev)) {
                  return prev;
               }

               const next = { ...prev };
               delete next[conversationId];
               return next;
            });

            setErrors((prev) => {
               if (!(conversationId in prev)) {
                  return prev;
               }

               const next = { ...prev };
               delete next[conversationId];
               return next;
            });

            if (previousProjectId) {
               setProjects((prev) =>
                  prev.map((project) =>
                     project.id === previousProjectId
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
                    : 'Failed to archive conversation.';

            setGlobalError(message);
            throw error;
         }
      },
      [activeConversationId, conversations, selectConversation]
   );

   const unarchiveConversation = useCallback(
      async (conversationId: string) => {
         if (!conversationId) {
            return;
         }

         try {
            const conversation =
               await unarchiveConversationRequest(conversationId);

            setArchivedConversations((prev) =>
               prev.filter((item) => item.id !== conversationId)
            );

            setConversations((prev) =>
               promoteConversation(prev, conversation.id, () => conversation)
            );

            ensureConversationState(conversation.id);

            if (conversation.projectId) {
               setProjects((prev) =>
                  prev.map((project) =>
                     project.id === conversation.projectId
                        ? {
                             ...project,
                             conversationCount: project.conversationCount + 1,
                          }
                        : project
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
                    : 'Failed to unarchive conversation.';

            setGlobalError(message);
            throw error;
         }
      },
      [ensureConversationState]
   );

   const deleteAllConversations = useCallback(async () => {
      try {
         const deleted = await deleteAllConversationsRequest();

         setConversations([]);
         setMessagesMap({});
         setErrors({});
         setActiveConversationId(null);
         setProjects((prev) =>
            prev.map((project) => ({
               ...project,
               conversationCount: 0,
            }))
         );

         setGlobalError(null);
         return deleted;
      } catch (error) {
         const message =
            error instanceof ChatRequestError
               ? error.message
               : error instanceof Error
                 ? error.message
                 : 'Failed to delete conversations.';

         setGlobalError(message);
         throw error;
      }
   }, []);

   const deleteArchivedConversations = useCallback(async () => {
      try {
         const deleted = await deleteArchivedConversationsRequest();

         if (deleted > 0) {
            const archivedIds = new Set(
               archivedConversations.map((conversation) => conversation.id)
            );

            setArchivedConversations([]);
            setMessagesMap((prev) => {
               if (archivedIds.size === 0) {
                  return prev;
               }

               const next = { ...prev };
               for (const id of archivedIds) {
                  delete next[id];
               }
               return next;
            });
            setErrors((prev) => {
               if (archivedIds.size === 0) {
                  return prev;
               }

               const next = { ...prev };
               for (const id of archivedIds) {
                  delete next[id];
               }
               return next;
            });
         }

         setGlobalError(null);
         return deleted;
      } catch (error) {
         const message =
            error instanceof ChatRequestError
               ? error.message
               : error instanceof Error
                 ? error.message
                 : 'Failed to delete archived conversations.';

         setGlobalError(message);
         throw error;
      }
   }, [archivedConversations]);

   const deleteAllProjects = useCallback(async () => {
      try {
         const deleted = await deleteAllProjectsRequest();

         const removedConversationIds = new Set<string>();
         let nextActiveId: string | null | undefined;

         setConversations((prev) => {
            const next: ChatConversation[] = [];

            for (const conversation of prev) {
               if (conversation.projectId === null) {
                  next.push(conversation);
               } else {
                  removedConversationIds.add(conversation.id);
               }
            }

            if (
               typeof nextActiveId === 'undefined' &&
               activeConversationId &&
               removedConversationIds.has(activeConversationId)
            ) {
               nextActiveId = next[0]?.id ?? null;
            }

            return next;
         });

         setArchivedConversations((prev) =>
            prev.filter((conversation) => conversation.projectId === null)
         );

         if (removedConversationIds.size > 0) {
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
            if (typeof nextActiveId !== 'undefined') {
               if (nextActiveId) {
                  selectConversation(nextActiveId);
               } else {
                  setActiveConversationId(null);
               }
            }
         }

         setProjects([]);
         setGlobalError(null);
         return deleted;
      } catch (error) {
         const message =
            error instanceof ChatRequestError
               ? error.message
               : error instanceof Error
                 ? error.message
                 : 'Failed to delete projects.';

         setGlobalError(message);
         throw error;
      }
   }, [activeConversationId, selectConversation]);

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
      () => startNewConversation('text'),
      [startNewConversation]
   );

   return {
      conversations,
      archivedConversations,
      projects,
      activeConversationId,
      messages,
      isSending,
      isLoadingConversations,
      isLoadingArchived,
      error,
      globalError,
      sendMessage,
      selectConversation,
      startNewConversation,
      deleteConversation,
      archiveConversation,
      unarchiveConversation,
      createProject,
      renameProject,
      deleteProject,
      deleteAllConversations,
      deleteArchivedConversations,
      deleteAllProjects,
      loadArchivedConversations,
      assignConversationToProject,
      renameConversation,
      resetChat,
   };
}
