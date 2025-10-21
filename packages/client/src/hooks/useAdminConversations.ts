import { useCallback, useMemo, useState } from 'react';

import type { ChatConversation, ChatConversationDetail } from '@/types/chat';
import type { AppUser } from '@/types/user';
import {
   deleteAdminUserConversation,
   fetchUserConversationDetail,
   fetchUserConversations,
   setAdminUserPassword,
   updateAdminUserProfile,
} from '@/lib/admin-client';
import { ChatRequestError } from '@/lib/chat-client';

function toErrorMessage(error: unknown): string {
   if (error instanceof ChatRequestError) {
      return error.message;
   }

   if (error instanceof Error) {
      return error.message;
   }

   return 'Something went wrong. Please try again.';
}

function sortConversations(list: ChatConversation[]): ChatConversation[] {
   return [...list].sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
   );
}

export type UseAdminConversationsReturn = {
   selectedUserId: string | null;
   selectedUser: AppUser | null;
   conversations: ChatConversation[];
   archivedConversations: ChatConversation[];
   isLoadingConversations: boolean;
   conversationsError: string | null;
   selectUser: (userId: string) => Promise<void>;
   refreshConversations: () => Promise<void>;
   clearUserSelection: () => void;
   selectedConversationId: string | null;
   conversationDetail: ChatConversationDetail | null;
   isLoadingConversationDetail: boolean;
   conversationError: string | null;
   selectConversation: (conversationId: string) => Promise<void>;
   clearConversationSelection: () => void;
   updateSelectedUserProfile: (input: {
      name: string;
      email: string;
      phone: string;
   }) => Promise<AppUser>;
   setSelectedUserPassword: (newPassword: string) => Promise<AppUser>;
   deleteConversation: (conversationId: string) => Promise<void>;
};

export function useAdminConversations(): UseAdminConversationsReturn {
   const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
   const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
   const [conversations, setConversations] = useState<ChatConversation[]>([]);
   const [archivedConversations, setArchivedConversations] = useState<
      ChatConversation[]
   >([]);
   const [isLoadingConversations, setIsLoadingConversations] = useState(false);
   const [conversationsError, setConversationsError] = useState<string | null>(
      null
   );

   const [selectedConversationId, setSelectedConversationId] = useState<
      string | null
   >(null);
   const [conversationDetail, setConversationDetail] =
      useState<ChatConversationDetail | null>(null);
   const [isLoadingConversationDetail, setIsLoadingConversationDetail] =
      useState(false);
   const [conversationError, setConversationError] = useState<string | null>(
      null
   );

   const loadConversations = useCallback(async (userId: string) => {
      setIsLoadingConversations(true);
      setConversationsError(null);
      setSelectedConversationId(null);
      setConversationDetail(null);
      setConversationError(null);

      try {
         const { user, conversations, archivedConversations } =
            await fetchUserConversations(userId);

         setSelectedUser(user);
         setConversations(sortConversations(conversations));
         setArchivedConversations(sortConversations(archivedConversations));
      } catch (error) {
         setConversationsError(toErrorMessage(error));
         throw error;
      } finally {
         setIsLoadingConversations(false);
      }
   }, []);

   const selectUser = useCallback(
      async (userId: string) => {
         setSelectedUserId(userId);
         try {
            await loadConversations(userId);
         } catch (error) {
            setSelectedUserId(null);
            setSelectedUser(null);
            throw error;
         }
      },
      [loadConversations]
   );

   const refreshConversations = useCallback(async () => {
      if (!selectedUserId) {
         return;
      }

      await loadConversations(selectedUserId);
   }, [loadConversations, selectedUserId]);

   const clearUserSelection = useCallback(() => {
      setSelectedUserId(null);
      setSelectedUser(null);
      setConversations([]);
      setArchivedConversations([]);
      setConversationsError(null);
      setSelectedConversationId(null);
      setConversationDetail(null);
      setConversationError(null);
   }, []);

   const loadConversationDetail = useCallback(
      async (conversationId: string) => {
         if (!selectedUserId) {
            return;
         }

         setIsLoadingConversationDetail(true);
         setConversationError(null);

         try {
            const { user, conversation } = await fetchUserConversationDetail(
               selectedUserId,
               conversationId
            );

            setSelectedUser(user);
            setConversationDetail(conversation);
         } catch (error) {
            setConversationError(toErrorMessage(error));
            throw error;
         } finally {
            setIsLoadingConversationDetail(false);
         }
      },
      [selectedUserId]
   );

   const selectConversation = useCallback(
      async (conversationId: string) => {
         setSelectedConversationId(conversationId);
         await loadConversationDetail(conversationId);
      },
      [loadConversationDetail]
   );

   const clearConversationSelection = useCallback(() => {
      setSelectedConversationId(null);
      setConversationDetail(null);
      setConversationError(null);
   }, []);

   const updateSelectedUserProfile = useCallback(
      async (input: { name: string; email: string; phone: string }) => {
         if (!selectedUserId) {
            throw new Error('No user selected.');
         }

         const updated = await updateAdminUserProfile(selectedUserId, input);
         setSelectedUser(updated);
         return updated;
      },
      [selectedUserId]
   );

   const setSelectedUserPassword = useCallback(
      async (newPassword: string) => {
         if (!selectedUserId) {
            throw new Error('No user selected.');
         }

         const updated = await setAdminUserPassword(
            selectedUserId,
            newPassword
         );
         setSelectedUser(updated);
         return updated;
      },
      [selectedUserId]
   );

   const deleteConversation = useCallback(
      async (conversationId: string) => {
         if (!selectedUserId) {
            return;
         }

         await deleteAdminUserConversation(selectedUserId, conversationId);

         setConversations((prev) =>
            prev.filter((conversation) => conversation.id !== conversationId)
         );
         setArchivedConversations((prev) =>
            prev.filter((conversation) => conversation.id !== conversationId)
         );

         setConversationDetail((detail) =>
            detail && detail.id === conversationId ? null : detail
         );

         setSelectedConversationId((current) =>
            current === conversationId ? null : current
         );
      },
      [selectedUserId]
   );

   return useMemo(
      () => ({
         selectedUserId,
         selectedUser,
         conversations,
         archivedConversations,
         isLoadingConversations,
         conversationsError,
         selectUser,
         refreshConversations,
         clearUserSelection,
         selectedConversationId,
         conversationDetail,
         isLoadingConversationDetail,
         conversationError,
         selectConversation,
         clearConversationSelection,
         updateSelectedUserProfile,
         setSelectedUserPassword,
         deleteConversation,
      }),
      [
         selectedUserId,
         selectedUser,
         conversations,
         archivedConversations,
         isLoadingConversations,
         conversationsError,
         selectUser,
         refreshConversations,
         clearUserSelection,
         selectedConversationId,
         conversationDetail,
         isLoadingConversationDetail,
         conversationError,
         selectConversation,
         clearConversationSelection,
         updateSelectedUserProfile,
         setSelectedUserPassword,
         deleteConversation,
      ]
   );
}
