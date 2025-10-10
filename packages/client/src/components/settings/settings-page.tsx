import {
   useCallback,
   useEffect,
   useMemo,
   useRef,
   useState,
   type FormEvent,
} from 'react';

import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import {
   Card,
   CardContent,
   CardDescription,
   CardHeader,
   CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { AuthActionResult } from '@/hooks/useAuth';
import type { ChatConversation } from '@/types/chat';
import type { ChatProject } from '@/types/project';
import type { AppUser } from '@/types/user';

type SettingsPageProps = {
   user: AppUser;
   projects: ChatProject[];
   conversations: ChatConversation[];
   archivedConversations: ChatConversation[];
   isLoadingConversations: boolean;
   isLoadingArchived: boolean;
   globalError: string | null;
   onClose: () => void;
   onUpdateProfile: (input: {
      name: string;
      email: string;
      phone: string;
   }) => Promise<AuthActionResult>;
   onChangePassword: (input: {
      currentPassword: string;
      newPassword: string;
   }) => Promise<AuthActionResult>;
   archiveConversation: (conversationId: string) => Promise<void>;
   unarchiveConversation: (conversationId: string) => Promise<void>;
   deleteConversation: (conversationId: string) => Promise<void>;
   deleteAllConversations: () => Promise<number>;
   deleteArchivedConversations: () => Promise<number>;
   deleteAllProjects: () => Promise<number>;
   loadArchivedConversations: () => Promise<void>;
};

type PendingMap = Record<string, boolean>;

function toErrorMessage(error: unknown): string {
   if (error instanceof Error) {
      return error.message;
   }

   return 'Something went wrong. Please try again.';
}

function formatTimestamp(date: Date | null | undefined) {
   if (!date) {
      return 'Unknown';
   }

   return new Intl.DateTimeFormat('en', {
      dateStyle: 'medium',
      timeStyle: 'short',
   }).format(date);
}

export function SettingsPage({
   user,
   projects,
   conversations,
   archivedConversations,
   isLoadingConversations,
   isLoadingArchived,
   globalError,
   onClose,
   onUpdateProfile,
   onChangePassword,
   archiveConversation,
   unarchiveConversation,
   deleteConversation,
   deleteAllConversations,
   deleteArchivedConversations,
   deleteAllProjects,
   loadArchivedConversations,
}: SettingsPageProps) {
   const [profileName, setProfileName] = useState(user.name);
   const [profileEmail, setProfileEmail] = useState(user.email);
   const [profilePhone, setProfilePhone] = useState(user.phone);
   const [isSavingProfile, setIsSavingProfile] = useState(false);
   const [profileMessage, setProfileMessage] = useState<string | null>(null);
   const [profileError, setProfileError] = useState<string | null>(null);

   const [currentPassword, setCurrentPassword] = useState('');
   const [newPassword, setNewPassword] = useState('');
   const [isSavingPassword, setIsSavingPassword] = useState(false);
   const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
   const [passwordError, setPasswordError] = useState<string | null>(null);

   const [pendingIds, setPendingIds] = useState<PendingMap>({});
   const [dataMessage, setDataMessage] = useState<string | null>(null);
   const [dataError, setDataError] = useState<string | null>(null);
   const [isDeletingAllChats, setIsDeletingAllChats] = useState(false);
   const [isDeletingArchivedChats, setIsDeletingArchivedChats] =
      useState(false);
   const [isDeletingAllProjects, setIsDeletingAllProjects] = useState(false);

   useEffect(() => {
      setProfileName(user.name);
      setProfileEmail(user.email);
      setProfilePhone(user.phone);
   }, [user.email, user.name, user.phone]);

   const hasRequestedArchived = useRef(false);

   useEffect(() => {
      if (hasRequestedArchived.current || isLoadingArchived) {
         return;
      }

      hasRequestedArchived.current = true;
      let cancelled = false;

      (async () => {
         try {
            await loadArchivedConversations();
         } catch {
            if (!cancelled) {
               hasRequestedArchived.current = false;
            }
         }
      })();

      return () => {
         cancelled = true;
      };
   }, [isLoadingArchived, loadArchivedConversations]);

   const totalChats = useMemo(
      () => conversations.length + archivedConversations.length,
      [archivedConversations.length, conversations.length]
   );

   const updatePending = useCallback(
      (conversationId: string, value: boolean) => {
         setPendingIds((prev) => {
            if (value) {
               return { ...prev, [conversationId]: true };
            }

            const next = { ...prev };
            delete next[conversationId];
            return next;
         });
      },
      []
   );

   const handleProfileSubmit = useCallback(
      async (event: FormEvent<HTMLFormElement>) => {
         event.preventDefault();
         setIsSavingProfile(true);
         setProfileMessage(null);
         setProfileError(null);

         const trimmedName = profileName.trim();
         const trimmedEmail = profileEmail.trim();
         const trimmedPhone = profilePhone.trim();

         try {
            const result = await onUpdateProfile({
               name: trimmedName,
               email: trimmedEmail,
               phone: trimmedPhone,
            });

            if (result.success) {
               setProfileMessage('Profile details updated.');
               setProfileError(null);
            } else {
               setProfileError(result.error);
               setProfileMessage(null);
            }
         } catch (error) {
            setProfileError(toErrorMessage(error));
            setProfileMessage(null);
         } finally {
            setIsSavingProfile(false);
         }
      },
      [onUpdateProfile, profileEmail, profileName, profilePhone]
   );

   const handlePasswordSubmit = useCallback(
      async (event: FormEvent<HTMLFormElement>) => {
         event.preventDefault();
         setIsSavingPassword(true);
         setPasswordMessage(null);
         setPasswordError(null);

         try {
            const result = await onChangePassword({
               currentPassword,
               newPassword,
            });

            if (result.success) {
               setPasswordMessage('Password updated successfully.');
               setPasswordError(null);
               setCurrentPassword('');
               setNewPassword('');
            } else {
               setPasswordError(result.error);
               setPasswordMessage(null);
            }
         } catch (error) {
            setPasswordError(toErrorMessage(error));
            setPasswordMessage(null);
         } finally {
            setIsSavingPassword(false);
         }
      },
      [currentPassword, newPassword, onChangePassword]
   );

   const handleArchive = useCallback(
      async (conversationId: string) => {
         updatePending(conversationId, true);
         setDataMessage(null);
         setDataError(null);

         try {
            await archiveConversation(conversationId);
            setDataMessage('Chat archived.');
         } catch (error) {
            setDataError(toErrorMessage(error));
         } finally {
            updatePending(conversationId, false);
         }
      },
      [archiveConversation, updatePending]
   );

   const handleUnarchive = useCallback(
      async (conversationId: string) => {
         updatePending(conversationId, true);
         setDataMessage(null);
         setDataError(null);

         try {
            await unarchiveConversation(conversationId);
            setDataMessage('Chat moved back to active.');
         } catch (error) {
            setDataError(toErrorMessage(error));
         } finally {
            updatePending(conversationId, false);
         }
      },
      [unarchiveConversation, updatePending]
   );

   const handleDeleteArchived = useCallback(
      async (conversationId: string) => {
         updatePending(conversationId, true);
         setDataMessage(null);
         setDataError(null);

         try {
            await deleteConversation(conversationId);
            setDataMessage('Chat deleted permanently.');
         } catch (error) {
            setDataError(toErrorMessage(error));
         } finally {
            updatePending(conversationId, false);
         }
      },
      [deleteConversation, updatePending]
   );

   const runBulkAction = useCallback(
      async (
         action: () => Promise<number>,
         setLoading: (state: boolean) => void,
         successMessage: string,
         fallbackMessage: string
      ) => {
         setLoading(true);
         setDataMessage(null);
         setDataError(null);

         try {
            const count = await action();
            setDataMessage(
               count > 0
                  ? `${successMessage} (${count} item${count === 1 ? '' : 's'} affected.)`
                  : fallbackMessage
            );
         } catch (error) {
            setDataError(toErrorMessage(error));
         } finally {
            setLoading(false);
         }
      },
      []
   );

   return (
      <div className="flex flex-col gap-6 pb-12 mt-6">
         <div className="flex flex-col gap-3 border-b border-border/60 pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
               <h2 className="text-3xl font-semibold text-foreground">
                  Settings
               </h2>
               <p className="text-sm text-muted-foreground">
                  Manage your account details, chat history, and data controls.
               </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
               <ThemeToggle className="sm:order-2" />
               <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                     void loadArchivedConversations();
                  }}
                  disabled={isLoadingArchived}
                  className="sm:order-1"
               >
                  {isLoadingArchived
                     ? 'Refreshing archived...'
                     : 'Refresh archived'}
               </Button>
               <Button type="button" onClick={onClose}>
                  Back to chats
               </Button>
            </div>
         </div>

         {globalError ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
               {globalError}
            </div>
         ) : null}

         <Card>
            <CardHeader>
               <CardTitle>Personal information</CardTitle>
               <CardDescription>
                  Update how we contact you. All fields are required.
               </CardDescription>
            </CardHeader>
            <CardContent>
               <form className="space-y-4" onSubmit={handleProfileSubmit}>
                  <div className="space-y-2">
                     <label className="text-sm font-medium text-foreground">
                        Full name
                     </label>
                     <Input
                        value={profileName}
                        onChange={(event) => setProfileName(event.target.value)}
                        required
                        maxLength={120}
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-sm font-medium text-foreground">
                        Email address
                     </label>
                     <Input
                        type="email"
                        value={profileEmail}
                        onChange={(event) =>
                           setProfileEmail(event.target.value)
                        }
                        required
                        autoComplete="email"
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-sm font-medium text-foreground">
                        Phone number
                     </label>
                     <Input
                        value={profilePhone}
                        onChange={(event) =>
                           setProfilePhone(event.target.value)
                        }
                        required
                        placeholder="+46123456789"
                     />
                     <p className="text-xs text-muted-foreground">
                        Include the country code, e.g. +46XXXXXXXXX.
                     </p>
                  </div>
                  {profileError ? (
                     <p className="text-sm text-destructive">{profileError}</p>
                  ) : null}
                  {profileMessage ? (
                     <p className="text-sm text-emerald-600 dark:text-emerald-400">
                        {profileMessage}
                     </p>
                  ) : null}
                  <Button type="submit" disabled={isSavingProfile}>
                     {isSavingProfile ? 'Saving...' : 'Save changes'}
                  </Button>
               </form>
            </CardContent>
         </Card>

         <Card>
            <CardHeader>
               <CardTitle>Password</CardTitle>
               <CardDescription>
                  Choose a strong password that includes upper-case letters and
                  special characters.
               </CardDescription>
            </CardHeader>
            <CardContent>
               <form className="space-y-4" onSubmit={handlePasswordSubmit}>
                  <div className="space-y-2">
                     <label className="text-sm font-medium text-foreground">
                        Current password
                     </label>
                     <Input
                        type="password"
                        value={currentPassword}
                        onChange={(event) =>
                           setCurrentPassword(event.target.value)
                        }
                        required
                        autoComplete="current-password"
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-sm font-medium text-foreground">
                        New password
                     </label>
                     <Input
                        type="password"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        required
                        autoComplete="new-password"
                     />
                     <p className="text-xs text-muted-foreground">
                        Minimum 8 characters, including an uppercase letter and
                        a special character.
                     </p>
                  </div>
                  {passwordError ? (
                     <p className="text-sm text-destructive">{passwordError}</p>
                  ) : null}
                  {passwordMessage ? (
                     <p className="text-sm text-emerald-600 dark:text-emerald-400">
                        {passwordMessage}
                     </p>
                  ) : null}
                  <Button type="submit" disabled={isSavingPassword}>
                     {isSavingPassword ? 'Updating...' : 'Change password'}
                  </Button>
               </form>
            </CardContent>
         </Card>

         <Card>
            <CardHeader>
               <CardTitle>Data controls</CardTitle>
               <CardDescription>
                  Archive or remove conversations and projects. These actions
                  cannot be undone.
               </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
               <div>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                     <span>Active chats: {conversations.length}</span>
                     <span>&bull;</span>
                     <span>Archived chats: {archivedConversations.length}</span>
                     <span>&bull;</span>
                     <span>Total chats: {totalChats}</span>
                     <span>&bull;</span>
                     <span>Projects: {projects.length}</span>
                  </div>
               </div>
               <div className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground/80">
                     Active chats
                  </h3>
                  <ul className="space-y-3">
                     {conversations.length === 0 ? (
                        <li className="rounded-md border border-dashed border-border/60 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                           No active chats yet.
                        </li>
                     ) : (
                        conversations.map((conversation) => (
                           <li
                              key={conversation.id}
                              className="flex flex-col gap-2 rounded-md border border-border/70 bg-background/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                           >
                              <div>
                                 <p className="font-medium text-foreground">
                                    {conversation.title}
                                 </p>
                                 <p className="text-xs text-muted-foreground">
                                    Updated{' '}
                                    {formatTimestamp(conversation.updatedAt)} ·{' '}
                                    {conversation.messageCount} message
                                    {conversation.messageCount === 1 ? '' : 's'}
                                 </p>
                              </div>
                              <Button
                                 variant="outline"
                                 size="sm"
                                 onClick={() => {
                                    void handleArchive(conversation.id);
                                 }}
                                 disabled={
                                    isLoadingConversations ||
                                    Boolean(pendingIds[conversation.id])
                                 }
                              >
                                 {pendingIds[conversation.id]
                                    ? 'Archiving...'
                                    : 'Archive'}
                              </Button>
                           </li>
                        ))
                     )}
                  </ul>
               </div>
               <div className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground/80">
                     Archived chats
                  </h3>
                  <ul className="space-y-3">
                     {archivedConversations.length === 0 ? (
                        <li className="rounded-md border border-dashed border-border/60 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                           No chats are archived.
                        </li>
                     ) : (
                        archivedConversations.map((conversation) => (
                           <li
                              key={conversation.id}
                              className="flex flex-col gap-3 rounded-md border border-border/70 bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                           >
                              <div>
                                 <p className="font-medium text-foreground">
                                    {conversation.title}
                                 </p>
                                 <p className="text-xs text-muted-foreground">
                                    Archived{' '}
                                    {formatTimestamp(conversation.archivedAt)} ·
                                    Updated{' '}
                                    {formatTimestamp(conversation.updatedAt)}
                                 </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                 <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                       void handleUnarchive(conversation.id);
                                    }}
                                    disabled={Boolean(
                                       pendingIds[conversation.id]
                                    )}
                                 >
                                    {pendingIds[conversation.id]
                                       ? 'Processing...'
                                       : 'Unarchive'}
                                 </Button>
                                 <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => {
                                       void handleDeleteArchived(
                                          conversation.id
                                       );
                                    }}
                                    disabled={Boolean(
                                       pendingIds[conversation.id]
                                    )}
                                 >
                                    {pendingIds[conversation.id]
                                       ? 'Deleting...'
                                       : 'Delete'}
                                 </Button>
                              </div>
                           </li>
                        ))
                     )}
                  </ul>
               </div>
               {dataError ? (
                  <p className="text-sm text-destructive">{dataError}</p>
               ) : null}
               {dataMessage ? (
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">
                     {dataMessage}
                  </p>
               ) : null}
               <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                  <Button
                     variant="outline"
                     onClick={() =>
                        void runBulkAction(
                           deleteAllConversations,
                           setIsDeletingAllChats,
                           'All chats deleted',
                           'There were no chats to delete.'
                        )
                     }
                     disabled={isDeletingAllChats}
                  >
                     {isDeletingAllChats
                        ? 'Deleting chats...'
                        : 'Delete all chats'}
                  </Button>
                  <Button
                     variant="outline"
                     onClick={() =>
                        void runBulkAction(
                           deleteArchivedConversations,
                           setIsDeletingArchivedChats,
                           'Archived chats deleted',
                           'No archived chats found.'
                        )
                     }
                     disabled={isDeletingArchivedChats}
                  >
                     {isDeletingArchivedChats
                        ? 'Deleting archived...'
                        : 'Delete all archived chats'}
                  </Button>
                  <Button
                     variant="destructive"
                     onClick={() =>
                        void runBulkAction(
                           deleteAllProjects,
                           setIsDeletingAllProjects,
                           'Projects deleted',
                           'No projects found.'
                        )
                     }
                     disabled={isDeletingAllProjects}
                  >
                     {isDeletingAllProjects
                        ? 'Deleting projects...'
                        : 'Delete all projects'}
                  </Button>
               </div>
            </CardContent>
         </Card>
      </div>
   );
}
