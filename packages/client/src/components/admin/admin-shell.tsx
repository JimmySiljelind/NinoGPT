import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';

import { Download } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
   Card,
   CardContent,
   CardDescription,
   CardHeader,
   CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ThemeToggle } from '@/components/theme-toggle';
import { useAdminUsers } from '@/hooks/useAdminUsers';
import { useAdminConversations } from '@/hooks/useAdminConversations';
import type { AdminUser } from '@/lib/admin-client';
import type { AppUser } from '@/types/user';
import type {
   ChatConversationDetail,
   ChatConversationType,
   ChatMessage,
} from '@/types/chat';
import { MessageContent } from '@/components/chat/message-content';

function toErrorMessage(error: unknown): string {
   if (error instanceof Error) {
      return error.message;
   }

   return 'Something went wrong. Please try again.';
}

type AdminShellProps = {
   user: AppUser;
   onLogout: () => Promise<void>;
};

export function AdminShell({ user, onLogout }: AdminShellProps) {
   const [view, setView] = useState<'users' | 'conversations' | 'settings'>(
      'users'
   );
   const usersState = useAdminUsers();
   const conversationsState = useAdminConversations();

   const nonAdminUsers = useMemo(
      () => usersState.users.filter((entry) => entry.role !== 'admin'),
      [usersState.users]
   );

   const handleLogout = useCallback(() => {
      void onLogout();
   }, [onLogout]);

   return (
      <div className="flex min-h-screen flex-col bg-background text-foreground">
         <header className="border-b border-border/80 bg-card/80 backdrop-blur">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
               <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                     Admin console
                  </p>
                  <h1 className="text-lg font-semibold">{user.name}</h1>
               </div>
               <div className="flex items-center gap-3">
                  <Button
                     variant={view === 'users' ? 'default' : 'outline'}
                     size="sm"
                     onClick={() => setView('users')}
                  >
                     Users
                  </Button>
                  <Button
                     variant={view === 'conversations' ? 'default' : 'outline'}
                     size="sm"
                     onClick={() => setView('conversations')}
                  >
                     Conversation database
                  </Button>
                  <Button
                     variant={view === 'settings' ? 'default' : 'outline'}
                     size="sm"
                     onClick={() => setView('settings')}
                  >
                     User settings
                  </Button>
                  <ThemeToggle className="shrink-0" />
                  <Button
                     variant="destructive"
                     size="sm"
                     onClick={handleLogout}
                  >
                     Log out
                  </Button>
               </div>
            </div>
         </header>

         <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-8">
            {view === 'users' ? (
               <UserManagementView
                  users={usersState.users}
                  isLoading={usersState.isLoading}
                  error={usersState.error}
                  refresh={usersState.refresh}
                  toggleAccess={usersState.toggleAccess}
                  removeUser={usersState.removeUser}
                  isProcessing={usersState.isProcessing}
               />
            ) : view === 'conversations' ? (
               <ConversationDatabaseView
                  users={nonAdminUsers}
                  conversationsState={conversationsState}
                  onUserDataRefreshed={() => {
                     void usersState.refresh();
                  }}
               />
            ) : (
               <UserSettingsView
                  users={usersState.users}
                  conversationsState={conversationsState}
                  onUserDataRefreshed={() => {
                     void usersState.refresh();
                  }}
               />
            )}
         </main>
      </div>
   );
}

type UserManagementViewProps = {
   users: AdminUser[];
   isLoading: boolean;
   error: string | null;
   refresh: () => Promise<void>;
   toggleAccess: (userId: string, isActive: boolean) => Promise<void>;
   removeUser: (userId: string) => Promise<void>;
   isProcessing: (userId: string) => boolean;
};

function UserManagementView({
   users,
   isLoading,
   error,
   refresh,
   toggleAccess,
   removeUser,
   isProcessing,
}: UserManagementViewProps) {
   const [statusMessage, setStatusMessage] = useState<string | null>(null);
   const [statusError, setStatusError] = useState<string | null>(null);

   const handleRefresh = useCallback(() => {
      setStatusMessage(null);
      setStatusError(null);
      void refresh().catch((refreshError) => {
         setStatusError(toErrorMessage(refreshError));
      });
   }, [refresh]);

   const sortedUsers = useMemo(
      () =>
         [...users].sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
         ),
      [users]
   );

   return (
      <Card>
         <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
               <CardTitle>User access</CardTitle>
               <CardDescription>
                  Manage who can sign in and remove accounts when required.
               </CardDescription>
            </div>
            <div className="flex items-center gap-2">
               <Button variant="outline" size="sm" onClick={handleRefresh}>
                  Refresh
               </Button>
            </div>
         </CardHeader>
         <CardContent className="space-y-4">
            {error && (
               <p className="text-sm text-destructive" role="alert">
                  {error}
               </p>
            )}
            {statusError && (
               <p className="text-sm text-destructive" role="alert">
                  {statusError}
               </p>
            )}
            {statusMessage && (
               <p className="text-sm text-emerald-600 dark:text-emerald-400">
                  {statusMessage}
               </p>
            )}
            {isLoading ? (
               <p className="text-sm text-muted-foreground">Loading users...</p>
            ) : sortedUsers.length === 0 ? (
               <p className="text-sm text-muted-foreground">
                  No users have been registered yet.
               </p>
            ) : (
               <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                     <thead>
                        <tr className="border-b border-border/70 text-xs uppercase tracking-wide text-muted-foreground">
                           <th className="px-3 py-2 font-medium">Name</th>
                           <th className="px-3 py-2 font-medium">Email</th>
                           <th className="px-3 py-2 font-medium">Role</th>
                           <th className="px-3 py-2 font-medium">Status</th>
                           <th className="px-3 py-2 font-medium">Created</th>
                           <th className="px-3 py-2 font-medium">Updated</th>
                           <th className="px-3 py-2 font-medium">Actions</th>
                        </tr>
                     </thead>
                     <tbody>
                        {sortedUsers.map((user) => {
                           const isBusy = isProcessing(user.id);
                           const canModify =
                              !user.isSelf && user.role !== 'admin';

                           return (
                              <tr
                                 key={user.id}
                                 className="border-b border-border/60 last:border-b-0"
                              >
                                 <td className="px-3 py-2 font-medium">
                                    {user.name}
                                 </td>
                                 <td className="px-3 py-2 text-muted-foreground">
                                    {user.email}
                                 </td>
                                 <td className="px-3 py-2 capitalize">
                                    {user.role}
                                 </td>
                                 <td className="px-3 py-2">
                                    <span
                                       className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                          user.isActive
                                             ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                             : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                       }`}
                                    >
                                       {user.isActive ? 'Active' : 'Disabled'}
                                    </span>
                                 </td>
                                 <td className="px-3 py-2 text-muted-foreground">
                                    {formatDate(user.createdAt)}
                                 </td>
                                 <td className="px-3 py-2 text-muted-foreground">
                                    {formatDate(user.updatedAt)}
                                 </td>
                                 <td className="px-3 py-2">
                                    <div className="flex flex-wrap gap-2">
                                       <Button
                                          variant="outline"
                                          size="sm"
                                          disabled={isBusy || !canModify}
                                          onClick={() => {
                                             if (!canModify) {
                                                return;
                                             }
                                             void toggleAccess(
                                                user.id,
                                                !user.isActive
                                             )
                                                .then(() => {
                                                   setStatusMessage(
                                                      user.isActive
                                                         ? 'Access revoked.'
                                                         : 'Access restored.'
                                                   );
                                                   setStatusError(null);
                                                })
                                                .catch((toggleError) => {
                                                   setStatusError(
                                                      toErrorMessage(
                                                         toggleError
                                                      )
                                                   );
                                                   setStatusMessage(null);
                                                });
                                          }}
                                       >
                                          {user.isActive
                                             ? 'Disable access'
                                             : 'Enable access'}
                                       </Button>
                                       <Button
                                          variant="destructive"
                                          size="sm"
                                          disabled={isBusy || !canModify}
                                          onClick={() => {
                                             if (
                                                !canModify ||
                                                !window.confirm(
                                                   `Delete ${user.name}'s account? This cannot be undone.`
                                                )
                                             ) {
                                                return;
                                             }
                                             void removeUser(user.id)
                                                .then(() => {
                                                   setStatusMessage(
                                                      'User deleted.'
                                                   );
                                                   setStatusError(null);
                                                })
                                                .catch((removeError) => {
                                                   setStatusError(
                                                      toErrorMessage(
                                                         removeError
                                                      )
                                                   );
                                                   setStatusMessage(null);
                                                });
                                          }}
                                       >
                                          Delete
                                       </Button>
                                    </div>
                                 </td>
                              </tr>
                           );
                        })}
                     </tbody>
                  </table>
               </div>
            )}
         </CardContent>
      </Card>
   );
}

type ConversationDatabaseViewProps = {
   users: AdminUser[];
   conversationsState: ReturnType<typeof useAdminConversations>;
   onUserDataRefreshed: () => void;
};

function ConversationDatabaseView({
   users,
   conversationsState,
   onUserDataRefreshed,
}: ConversationDatabaseViewProps) {
   const {
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
      deleteConversation,
   } = conversationsState;

   const [deletingConversationIds, setDeletingConversationIds] = useState<
      Record<string, boolean>
   >({});
   const [statusMessage, setStatusMessage] = useState<string | null>(null);
   const [statusError, setStatusError] = useState<string | null>(null);

   useEffect(() => {
      setStatusMessage(null);
      setStatusError(null);
      setDeletingConversationIds({});
   }, [selectedUserId]);

   useEffect(() => {
      if (selectedUserId && !users.some((user) => user.id === selectedUserId)) {
         clearUserSelection();
      }
   }, [users, selectedUserId, clearUserSelection]);

   const handleUserChange = useCallback(
      (value: string) => {
         setStatusMessage(null);
         setStatusError(null);
         setDeletingConversationIds({});

         if (!value) {
            clearUserSelection();
            return;
         }

         void selectUser(value).catch((error) => {
            setStatusError(toErrorMessage(error));
         });
      },
      [selectUser, clearUserSelection]
   );

   const handleRefresh = useCallback(() => {
      setStatusMessage(null);
      setStatusError(null);
      void refreshConversations().catch((error) => {
         setStatusError(toErrorMessage(error));
      });
   }, [refreshConversations]);

   const handleDeleteConversation = useCallback(
      async (conversationId: string) => {
         setStatusMessage(null);
         setStatusError(null);
         setDeletingConversationIds((prev) => ({
            ...prev,
            [conversationId]: true,
         }));

         try {
            await deleteConversation(conversationId);
            await refreshConversations();
            onUserDataRefreshed();
            setStatusMessage('Conversation deleted.');
         } catch (error) {
            setStatusError(toErrorMessage(error));
         } finally {
            setDeletingConversationIds((prev) => {
               const next = { ...prev };
               delete next[conversationId];
               return next;
            });
         }
      },
      [deleteConversation, refreshConversations, onUserDataRefreshed]
   );

   const groups = useMemo(
      () => [
         { label: 'Active conversations', items: conversations },
         { label: 'Archived conversations', items: archivedConversations },
      ],
      [conversations, archivedConversations]
   );

   return (
      <div className="grid gap-6 md:grid-cols-[320px,1fr]">
         <Card className="h-max">
            <CardHeader className="space-y-3">
               <div>
                  <CardTitle>Users</CardTitle>
                  <CardDescription>
                     Choose a user to inspect their conversation history.
                  </CardDescription>
               </div>
               <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/50"
                  value={selectedUserId ?? ''}
                  onChange={(event) => handleUserChange(event.target.value)}
               >
                  <option value="">Select a user</option>
                  {users.map((user) => (
                     <option key={user.id} value={user.id}>
                        {user.name} - {user.email}
                     </option>
                  ))}
               </select>
               <div className="flex items-center gap-2">
                  <Button
                     variant="outline"
                     size="sm"
                     onClick={handleRefresh}
                     disabled={!selectedUserId}
                  >
                     Refresh
                  </Button>
                  <Button
                     variant="ghost"
                     size="sm"
                     onClick={() => {
                        setStatusMessage(null);
                        setStatusError(null);
                        setDeletingConversationIds({});
                        clearUserSelection();
                     }}
                     disabled={!selectedUserId}
                  >
                     Clear
                  </Button>
               </div>
               {conversationsError && (
                  <p className="text-sm text-destructive" role="alert">
                     {conversationsError}
                  </p>
               )}
               {statusError && (
                  <p className="text-sm text-destructive" role="alert">
                     {statusError}
                  </p>
               )}
               {statusMessage && (
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">
                     {statusMessage}
                  </p>
               )}
            </CardHeader>
         </Card>
         <Card className="flex flex-col">
            <CardHeader>
               <CardTitle>Conversation history</CardTitle>
               <CardDescription>
                  {selectedUser
                     ? `Viewing conversations for ${selectedUser.name}.`
                     : 'Select a user to view their conversations.'}
               </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
               {isLoadingConversations ? (
                  <p className="text-sm text-muted-foreground">
                     Loading conversations...
                  </p>
               ) : !selectedUserId ? (
                  <p className="text-sm text-muted-foreground">
                     Choose a user from the list to load their conversations.
                  </p>
               ) : groups.every(({ items }) => items.length === 0) ? (
                  <p className="text-sm text-muted-foreground">
                     No conversations found for this user.
                  </p>
               ) : (
                  <div className="grid gap-6 lg:grid-cols-2">
                     <div className="space-y-4">
                        {groups.map(({ label, items }) => (
                           <div key={label} className="space-y-2">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                 {label}
                              </p>
                              <div className="rounded-md border border-border/70">
                                 <ul className="max-h-[320px] overflow-y-auto text-sm">
                                    {items.length === 0 ? (
                                       <li className="px-3 py-2 text-muted-foreground">
                                          No conversations.
                                       </li>
                                    ) : (
                                       items.map((conversation) => {
                                          const isSelected =
                                             selectedConversationId ===
                                             conversation.id;
                                          const isDeleting =
                                             deletingConversationIds[
                                                conversation.id
                                             ] === true;

                                          return (
                                             <li
                                                key={conversation.id}
                                                className={`cursor-pointer border-b border-border/60 px-3 py-2 transition last:border-b-0 ${
                                                   isSelected
                                                      ? 'bg-primary/10'
                                                      : 'hover:bg-muted/80'
                                                }`}
                                                onClick={() => {
                                                   void selectConversation(
                                                      conversation.id
                                                   ).catch((error) => {
                                                      setStatusError(
                                                         toErrorMessage(error)
                                                      );
                                                   });
                                                }}
                                             >
                                                <div className="flex items-start justify-between gap-3">
                                                   <div>
                                                      <p className="font-medium">
                                                         {conversation.title}
                                                      </p>
                                                      <p className="text-xs text-muted-foreground">
                                                         Updated{' '}
                                                         {formatRelativeDate(
                                                            conversation.updatedAt
                                                         )}
                                                      </p>
                                                   </div>
                                                   <div className="flex items-center gap-2">
                                                      <span className="text-xs uppercase text-muted-foreground">
                                                         {conversation.type}
                                                      </span>
                                                      <Button
                                                         variant="destructive"
                                                         size="sm"
                                                         disabled={isDeleting}
                                                         onClick={(event) => {
                                                            event.stopPropagation();
                                                            void handleDeleteConversation(
                                                               conversation.id
                                                            );
                                                         }}
                                                      >
                                                         {isDeleting
                                                            ? 'Deleting...'
                                                            : 'Delete'}
                                                      </Button>
                                                   </div>
                                                </div>
                                             </li>
                                          );
                                       })
                                    )}
                                 </ul>
                              </div>
                           </div>
                        ))}
                     </div>
                     <div className="space-y-3">
                        {conversationError && (
                           <p className="text-sm text-destructive" role="alert">
                              {conversationError}
                           </p>
                        )}
                        {isLoadingConversationDetail ? (
                           <p className="text-sm text-muted-foreground">
                              Loading conversation...
                           </p>
                        ) : !conversationDetail ? (
                           <p className="text-sm text-muted-foreground">
                              Select a conversation to inspect its messages.
                           </p>
                        ) : (
                           <ConversationDetailCard
                              conversation={conversationDetail}
                           />
                        )}
                        <div className="flex gap-2">
                           <Button
                              variant="outline"
                              size="sm"
                              onClick={clearConversationSelection}
                              disabled={!conversationDetail}
                           >
                              Close conversation
                           </Button>
                        </div>
                     </div>
                  </div>
               )}
            </CardContent>
         </Card>
      </div>
   );
}

type UserSettingsViewProps = {
   users: AdminUser[];
   conversationsState: ReturnType<typeof useAdminConversations>;
   onUserDataRefreshed: () => void;
};

function UserSettingsView({
   users,
   conversationsState,
   onUserDataRefreshed,
}: UserSettingsViewProps) {
   const {
      selectedUserId,
      selectedUser,
      conversations,
      archivedConversations,
      conversationsError,
      isLoadingConversations,
      selectUser,
      refreshConversations,
      clearUserSelection,
      updateSelectedUserProfile,
      setSelectedUserPassword,
      deleteConversation,
      clearConversationSelection,
   } = conversationsState;

   const [statusMessage, setStatusMessage] = useState<string | null>(null);
   const [statusError, setStatusError] = useState<string | null>(null);
   const hasAutoSelected = useRef(false);

   useEffect(() => {
      if (selectedUserId && !users.some((user) => user.id === selectedUserId)) {
         clearUserSelection();
      }
   }, [users, selectedUserId, clearUserSelection]);

   useEffect(() => {
      if (hasAutoSelected.current) {
         return;
      }

      if (!selectedUserId) {
         const selfUser = users.find((entry) => entry.isSelf);
         if (selfUser) {
            hasAutoSelected.current = true;
            void selectUser(selfUser.id).catch((error) => {
               setStatusError(toErrorMessage(error));
            });
         }
      }
   }, [selectedUserId, users, selectUser]);

   const handleUserChange = useCallback(
      (value: string) => {
         hasAutoSelected.current = true;
         setStatusMessage(null);
         setStatusError(null);

         if (!value) {
            clearUserSelection();
            return;
         }

         void selectUser(value).catch((error) => {
            setStatusError(toErrorMessage(error));
         });
      },
      [selectUser, clearUserSelection]
   );

   const handleRefresh = useCallback(() => {
      setStatusMessage(null);
      setStatusError(null);
      void refreshConversations().catch((error) => {
         setStatusError(toErrorMessage(error));
      });
   }, [refreshConversations]);

   const handleUpdateProfile = useCallback(
      async (input: { name: string; email: string; phone: string }) => {
         await updateSelectedUserProfile(input);
         await refreshConversations();
         onUserDataRefreshed();
      },
      [updateSelectedUserProfile, refreshConversations, onUserDataRefreshed]
   );

   const handleSetPassword = useCallback(
      async (newPassword: string) => {
         await setSelectedUserPassword(newPassword);
         onUserDataRefreshed();
      },
      [setSelectedUserPassword, onUserDataRefreshed]
   );

   const handleDeleteAllConversations = useCallback(async () => {
      const ids = [
         ...conversations.map((conversation) => conversation.id),
         ...archivedConversations.map((conversation) => conversation.id),
      ];

      if (ids.length === 0) {
         return false;
      }

      for (const id of ids) {
         await deleteConversation(id);
      }

      await refreshConversations();
      clearConversationSelection();
      onUserDataRefreshed();
      return true;
   }, [
      conversations,
      archivedConversations,
      deleteConversation,
      refreshConversations,
      clearConversationSelection,
      onUserDataRefreshed,
   ]);

   return (
      <div className="grid gap-6 md:grid-cols-[320px,1fr]">
         <Card className="h-max">
            <CardHeader className="space-y-3">
               <div>
                  <CardTitle>User selection</CardTitle>
                  <CardDescription>
                     Choose a user to manage their profile and credentials.
                  </CardDescription>
               </div>
               <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/50"
                  value={selectedUserId ?? ''}
                  onChange={(event) => handleUserChange(event.target.value)}
               >
                  <option value="">Select a user</option>
                  {users.map((user) => (
                     <option key={user.id} value={user.id}>
                        {user.name} - {user.email}
                        {user.isSelf ? ' (You)' : ''}
                     </option>
                  ))}
               </select>
               <div className="flex items-center gap-2">
                  <Button
                     variant="outline"
                     size="sm"
                     onClick={handleRefresh}
                     disabled={!selectedUserId}
                  >
                     Refresh
                  </Button>
                  <Button
                     variant="ghost"
                     size="sm"
                     onClick={() => {
                        hasAutoSelected.current = false;
                        setStatusMessage(null);
                        setStatusError(null);
                        clearUserSelection();
                     }}
                     disabled={!selectedUserId}
                  >
                     Clear
                  </Button>
               </div>
               {conversationsError && (
                  <p className="text-sm text-destructive" role="alert">
                     {conversationsError}
                  </p>
               )}
               {statusError && (
                  <p className="text-sm text-destructive" role="alert">
                     {statusError}
                  </p>
               )}
               {statusMessage && (
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">
                     {statusMessage}
                  </p>
               )}
            </CardHeader>
         </Card>
         {isLoadingConversations ? (
            <Card className="p-6">
               <p className="text-sm text-muted-foreground">
                  Loading user data...
               </p>
            </Card>
         ) : !selectedUser ? (
            <Card className="p-6">
               <CardTitle className="text-base">User settings</CardTitle>
               <p className="mt-2 text-sm text-muted-foreground">
                  Choose a user to edit their profile information, change
                  passwords, or clear conversations.
               </p>
            </Card>
         ) : (
            <UserSettingsPanel
               key={selectedUser.id}
               user={selectedUser}
               onUpdateProfile={async (input) => {
                  await handleUpdateProfile(input);
                  setStatusMessage('Profile updated.');
                  setStatusError(null);
               }}
               onSetPassword={async (password) => {
                  await handleSetPassword(password);
                  setStatusMessage('Password updated.');
                  setStatusError(null);
               }}
               onDeleteAllConversations={async () => {
                  const deleted = await handleDeleteAllConversations();
                  if (deleted) {
                     setStatusMessage('All conversations deleted.');
                  } else {
                     setStatusMessage('No conversations to delete.');
                  }
                  setStatusError(null);
                  return deleted;
               }}
            />
         )}
      </div>
   );
}

type ConversationDetailCardProps = {
   conversation: ChatConversationDetail;
};

function ConversationDetailCard({ conversation }: ConversationDetailCardProps) {
   return (
      <div className="rounded-md border border-border/70">
         <div className="border-b border-border/70 bg-muted/40 px-4 py-3">
            <h3 className="text-sm font-semibold">{conversation.title}</h3>
            <p className="text-xs text-muted-foreground">
               {conversation.type.toUpperCase()} - Created{' '}
               {formatDateTime(conversation.createdAt)} - Updated{' '}
               {formatDateTime(conversation.updatedAt)} -{' '}
               {conversation.messageCount} messages
            </p>
         </div>
         <div className="max-h-[360px] space-y-3 overflow-y-auto px-4 py-3">
            {conversation.messages.length === 0 ? (
               <p className="text-sm text-muted-foreground">
                  This conversation has no messages yet.
               </p>
            ) : (
               conversation.messages.map((message) => (
                  <AdminMessageItem
                     key={message.id}
                     message={message}
                     conversationType={conversation.type}
                  />
               ))
            )}
         </div>
      </div>
   );
}

type AdminMessageItemProps = {
   message: ChatMessage;
   conversationType: ChatConversationType;
};

function AdminMessageItem({
   message,
   conversationType,
}: AdminMessageItemProps) {
   const isAssistant = message.role !== 'user';
   const shouldRenderImage =
      conversationType === 'image' &&
      message.role === 'assistant' &&
      typeof message.content === 'string' &&
      /^data:image\//i.test(message.content);

   const handleDownload = () => {
      if (!shouldRenderImage || typeof window === 'undefined') {
         return;
      }

      try {
         const anchor = document.createElement('a');
         anchor.href = message.content;
         const match = /^data:image\/([a-zA-Z0-9+]+);/i.exec(message.content);
         const extension = match?.[1] ?? 'png';
         const timestamp = message.createdAt
            .toISOString()
            .replace(/[:.]/g, '-');
         anchor.download = `chat-image-${timestamp}.${extension}`;
         document.body.appendChild(anchor);
         anchor.click();
         document.body.removeChild(anchor);
      } catch (error) {
         console.error('Failed to download image', error);
      }
   };

   return (
      <div
         className={`rounded-md border px-3 py-2 text-sm ${
            isAssistant
               ? 'border-primary/30 bg-primary/5'
               : 'border-muted-foreground/30 bg-muted/50'
         }`}
      >
         <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
            <span>{message.role}</span>
            <span>{formatDateTime(message.createdAt)}</span>
         </div>
         {shouldRenderImage ? (
            <div className="space-y-2">
               <figure className="overflow-hidden rounded-lg border border-border/60 bg-card">
                  <img
                     src={message.content}
                     alt="Generated image"
                     className="h-auto w-full object-cover"
                  />
               </figure>
               <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="inline-flex items-center gap-2"
                  onClick={handleDownload}
               >
                  <Download className="h-4 w-4" aria-hidden />
                  <span>Download</span>
               </Button>
            </div>
         ) : (
            <MessageContent content={message.content} />
         )}
      </div>
   );
}

type UserSettingsPanelProps = {
   user: AppUser;
   onUpdateProfile: (input: {
      name: string;
      email: string;
      phone: string;
   }) => Promise<void>;
   onSetPassword: (newPassword: string) => Promise<void>;
   onDeleteAllConversations: () => Promise<boolean>;
};

function UserSettingsPanel({
   user,
   onUpdateProfile,
   onSetPassword,
   onDeleteAllConversations,
}: UserSettingsPanelProps) {
   const [name, setName] = useState(user.name);
   const [email, setEmail] = useState(user.email);
   const [phone, setPhone] = useState(user.phone);
   const [profileError, setProfileError] = useState<string | null>(null);
   const [profileMessage, setProfileMessage] = useState<string | null>(null);
   const [isSavingProfile, setIsSavingProfile] = useState(false);

   const [newPassword, setNewPassword] = useState('');
   const [passwordError, setPasswordError] = useState<string | null>(null);
   const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
   const [isSavingPassword, setIsSavingPassword] = useState(false);

   const [isDeletingChats, setIsDeletingChats] = useState(false);
   const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
   const [deleteError, setDeleteError] = useState<string | null>(null);

   useEffect(() => {
      setName(user.name);
      setEmail(user.email);
      setPhone(user.phone);
      setProfileError(null);
      setProfileMessage(null);
      setPasswordError(null);
      setPasswordMessage(null);
      setDeleteError(null);
      setDeleteMessage(null);
      setNewPassword('');
   }, [user]);

   const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setProfileError(null);
      setProfileMessage(null);
      setIsSavingProfile(true);

      try {
         await onUpdateProfile({ name, email, phone });
         setProfileMessage('Profile updated successfully.');
      } catch (error) {
         setProfileError(toErrorMessage(error));
      } finally {
         setIsSavingProfile(false);
      }
   };

   const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setPasswordError(null);
      setPasswordMessage(null);

      const trimmed = newPassword.trim();
      if (!trimmed) {
         setPasswordError('Please provide a new password.');
         return;
      }

      setIsSavingPassword(true);

      try {
         await onSetPassword(trimmed);
         setPasswordMessage('Password updated.');
         setNewPassword('');
      } catch (error) {
         setPasswordError(toErrorMessage(error));
      } finally {
         setIsSavingPassword(false);
      }
   };

   const handleDeleteChats = async () => {
      setDeleteError(null);
      setDeleteMessage(null);
      setIsDeletingChats(true);

      try {
         const deleted = await onDeleteAllConversations();
         setDeleteMessage(
            deleted
               ? 'All conversations deleted.'
               : 'No conversations to delete.'
         );
      } catch (error) {
         setDeleteError(toErrorMessage(error));
      } finally {
         setIsDeletingChats(false);
      }
   };

   return (
      <Card>
         <CardHeader>
            <CardTitle>User settings</CardTitle>
            <CardDescription>
               Manage profile details, reset passwords, and clear conversations.
            </CardDescription>
         </CardHeader>
         <CardContent className="space-y-6">
            <form onSubmit={handleProfileSubmit} className="space-y-4">
               <div className="grid gap-3 sm:grid-cols-3">
                  <label className="flex flex-col gap-1 text-sm">
                     <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Name
                     </span>
                     <Input
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        required
                     />
                  </label>
                  <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                     <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Email
                     </span>
                     <Input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                     />
                  </label>
                  <label className="flex flex-col gap-1 text-sm sm:col-span-3">
                     <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Phone
                     </span>
                     <Input
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        placeholder="(+46) 0701234567"
                        required
                     />
                  </label>
               </div>
               {profileError && (
                  <p className="text-sm text-destructive" role="alert">
                     {profileError}
                  </p>
               )}
               {profileMessage && (
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">
                     {profileMessage}
                  </p>
               )}
               <Button type="submit" disabled={isSavingProfile}>
                  {isSavingProfile ? 'Saving...' : 'Save profile'}
               </Button>
            </form>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
               <div className="flex flex-col gap-1 text-sm">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                     New password
                  </span>
                  <Input
                     type="password"
                     value={newPassword}
                     onChange={(event) => setNewPassword(event.target.value)}
                     placeholder="Enter a new password"
                     required
                  />
               </div>
               {passwordError && (
                  <p className="text-sm text-destructive" role="alert">
                     {passwordError}
                  </p>
               )}
               {passwordMessage && (
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">
                     {passwordMessage}
                  </p>
               )}
               <Button type="submit" disabled={isSavingPassword}>
                  {isSavingPassword ? 'Updating...' : 'Update password'}
               </Button>
            </form>

            <div className="space-y-3">
               {deleteError && (
                  <p className="text-sm text-destructive" role="alert">
                     {deleteError}
                  </p>
               )}
               {deleteMessage && (
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">
                     {deleteMessage}
                  </p>
               )}
               <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDeleteChats}
                  disabled={isDeletingChats}
               >
                  {isDeletingChats
                     ? 'Deleting chats...'
                     : 'Delete all conversations'}
               </Button>
            </div>
         </CardContent>
      </Card>
   );
}

function formatDate(date: Date) {
   return new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
   }).format(date);
}

function formatDateTime(date: Date) {
   return new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
   }).format(date);
}

function formatRelativeDate(date: Date) {
   const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
   const now = Date.now();
   const diff = date.getTime() - now;
   const minutes = Math.round(diff / (60 * 1000));

   if (Math.abs(minutes) < 60) {
      return formatter.format(minutes, 'minute');
   }

   const hours = Math.round(minutes / 60);

   if (Math.abs(hours) < 24) {
      return formatter.format(hours, 'hour');
   }

   const days = Math.round(hours / 24);
   return formatter.format(days, 'day');
}
