import { useCallback, useEffect, useMemo, useState } from 'react';

import {
   deleteAdminUser,
   listAdminUsers,
   updateAdminUserAccess,
   type AdminUser,
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

export type UseAdminUsersReturn = {
   users: AdminUser[];
   isLoading: boolean;
   error: string | null;
   refresh: () => Promise<void>;
   toggleAccess: (userId: string, isActive: boolean) => Promise<void>;
   removeUser: (userId: string) => Promise<void>;
   isProcessing: (userId: string) => boolean;
};

export function useAdminUsers(): UseAdminUsersReturn {
   const [users, setUsers] = useState<AdminUser[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
   const [mutatingIds, setMutatingIds] = useState<Set<string>>(() => new Set());

   const setMutating = useCallback((userId: string, isActive: boolean) => {
      setMutatingIds((prev) => {
         const next = new Set(prev);
         if (isActive) {
            next.add(userId);
         } else {
            next.delete(userId);
         }
         return next;
      });
   }, []);

   const refresh = useCallback(async () => {
      setIsLoading(true);
      try {
         const list = await listAdminUsers();
         setUsers(list);
         setError(null);
      } catch (refreshError) {
         setError(toErrorMessage(refreshError));
      } finally {
         setIsLoading(false);
      }
   }, []);

   useEffect(() => {
      void refresh();
   }, [refresh]);

   const toggleAccess = useCallback(
      async (userId: string, nextActive: boolean) => {
         setMutating(userId, true);
         try {
            const updated = await updateAdminUserAccess(userId, nextActive);
            setUsers((prev) =>
               prev.map((user) =>
                  user.id === userId
                     ? {
                          ...user,
                          ...updated,
                       }
                     : user
               )
            );
            setError(null);
         } catch (toggleError) {
            setError(toErrorMessage(toggleError));
            throw toggleError;
         } finally {
            setMutating(userId, false);
         }
      },
      [setMutating]
   );

   const removeUser = useCallback(
      async (userId: string) => {
         setMutating(userId, true);
         try {
            await deleteAdminUser(userId);
            setUsers((prev) => prev.filter((user) => user.id !== userId));
            setError(null);
         } catch (deleteError) {
            setError(toErrorMessage(deleteError));
            throw deleteError;
         } finally {
            setMutating(userId, false);
         }
      },
      [setMutating]
   );

   const isProcessing = useCallback(
      (userId: string) => mutatingIds.has(userId),
      [mutatingIds]
   );

   return useMemo(
      () => ({
         users,
         isLoading,
         error,
         refresh,
         toggleAccess,
         removeUser,
         isProcessing,
      }),
      [users, isLoading, error, refresh, toggleAccess, removeUser, isProcessing]
   );
}
