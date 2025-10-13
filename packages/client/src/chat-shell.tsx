import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent, KeyboardEvent } from 'react';
import type { AppUser } from '@/types/user';
import type { AuthActionResult } from '@/hooks/useAuth';

import { ChatMessageList } from '@/components/chat/chat-message-list';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { SettingsPage } from '@/components/settings/settings-page';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Image as ImageIcon, Send } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useChat } from '@/hooks/useChat';

export type ChatShellProps = {
   onLogout: () => Promise<void>;
   onUpdateProfile: (input: {
      name: string;
      email: string;
      phone: string;
   }) => Promise<AuthActionResult>;
   onChangePassword: (input: {
      currentPassword: string;
      newPassword: string;
   }) => Promise<AuthActionResult>;
   user: AppUser;
};

export function ChatShell({
   onLogout,
   onUpdateProfile,
   onChangePassword,
   user,
}: ChatShellProps) {
   const accountName = user.name;
   const {
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
      selectConversation: selectConversationInternal,
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
   } = useChat();
   const [view, setView] = useState<'chat' | 'settings'>('chat');
   const [inputValue, setInputValue] = useState('');
   const textareaRef = useRef<HTMLTextAreaElement | null>(null);

   const selectConversation = useCallback(
      (conversationId: string) => {
         setView('chat');
         selectConversationInternal(conversationId);
      },
      [selectConversationInternal]
   );

   const activeConversation = useMemo(
      () =>
         conversations.find(
            (conversation) => conversation.id === activeConversationId
         ) ?? null,
      [conversations, activeConversationId]
   );

   const activeConversationType = activeConversation?.type ?? 'text';

   const canSubmit =
      inputValue.trim().length > 0 &&
      !isSending &&
      !isLoadingConversations &&
      Boolean(activeConversationId);

   const inputPlaceholder =
      activeConversationType === 'image'
         ? 'Describe the image you want to create'
         : 'Ask anything';

   useEffect(() => {
      const el = textareaRef.current;
      if (!el) {
         return;
      }

      el.style.height = 'auto';
      const minHeight = 50;
      const maxHeight = 150;
      const nextHeight = Math.min(el.scrollHeight, maxHeight);
      el.style.height = `${Math.max(nextHeight, minHeight)}px`;
   }, [inputValue]);

   const submitMessage = useCallback(async () => {
      const trimmed = inputValue.trim();
      if (!trimmed) {
         return;
      }

      setInputValue('');
      await sendMessage(trimmed);
   }, [inputValue, sendMessage]);

   const handleSubmit = useCallback(
      async (event: FormEvent<HTMLFormElement>) => {
         event.preventDefault();
         if (!canSubmit) {
            return;
         }

         await submitMessage();
      },
      [canSubmit, submitMessage]
   );

   const handleKeyDown = useCallback(
      async (event: KeyboardEvent<HTMLTextAreaElement>) => {
         if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            if (!canSubmit) {
               return;
            }

            await submitMessage();
         }
      },
      [canSubmit, submitMessage]
   );

   const handleConversationChange = useCallback(
      (event: ChangeEvent<HTMLSelectElement>) => {
         if (event.target.value) {
            selectConversation(event.target.value);
         }
      },
      [selectConversation]
   );

   const startNewChat = useCallback(() => {
      setView('chat');
      void startNewConversation('text');
   }, [startNewConversation]);

   const startNewImageChat = useCallback(() => {
      setView('chat');
      void startNewConversation('image');
   }, [startNewConversation]);

   const openSettings = useCallback(() => {
      setView('settings');
   }, []);

   const closeSettings = useCallback(() => {
      setView('chat');
   }, []);

   const headerMessage = (() => {
      if (isLoadingConversations) {
         return 'Loading conversations...';
      }

      if (activeConversation) {
         const prefix =
            activeConversationType === 'image' ? 'Image chat' : 'Chat';
         return `${prefix} · Last updated ${formatUpdatedAt(activeConversation.updatedAt)}`;
      }

      return 'Start a chat to begin.';
   })();

   return (
      <div className="min-h-screen bg-background sm:pl-72">
         <ChatSidebar
            conversations={conversations}
            projects={projects}
            activeConversationId={activeConversationId}
            onSelectConversation={selectConversation}
            onNewConversation={startNewChat}
            onNewImageConversation={startNewImageChat}
            onDeleteConversation={deleteConversation}
            onCreateProject={createProject}
            onRenameProject={renameProject}
            onDeleteProject={deleteProject}
            onRenameConversation={renameConversation}
            onAssignConversationToProject={assignConversationToProject}
            currentUserName={accountName}
            currentUserEmail={user.email}
            onLogout={onLogout}
            onOpenSettings={openSettings}
            isSettingsView={view === 'settings'}
         />
         <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 sm:px-6 lg:px-8">
            {view === 'settings' ? (
               <SettingsPage
                  user={user}
                  projects={projects}
                  conversations={conversations}
                  archivedConversations={archivedConversations}
                  isLoadingConversations={isLoadingConversations}
                  isLoadingArchived={isLoadingArchived}
                  globalError={globalError}
                  onClose={closeSettings}
                  onUpdateProfile={onUpdateProfile}
                  onChangePassword={onChangePassword}
                  archiveConversation={archiveConversation}
                  unarchiveConversation={unarchiveConversation}
                  deleteConversation={deleteConversation}
                  deleteAllConversations={deleteAllConversations}
                  deleteArchivedConversations={deleteArchivedConversations}
                  deleteAllProjects={deleteAllProjects}
                  loadArchivedConversations={loadArchivedConversations}
               />
            ) : (
               <>
                  <header className="sticky top-0 z-20 flex flex-col gap-3 border-b border-border/60 bg-background/90 py-4 sm:flex-row sm:items-center sm:justify-between sm:py-6 supports-[backdrop-filter]:bg-background/75 supports-[backdrop-filter]:backdrop-blur">
                     <div>
                        <h1 className="text-3xl font-semibold text-foreground">
                           NinoGPT
                        </h1>
                        <p className="text-sm text-muted-foreground">
                           {headerMessage}
                        </p>
                        <p className="text-xs text-muted-foreground/80">
                           Signed in as {accountName}
                        </p>
                     </div>
                     <div className="hidden items-center gap-2 sm:flex">
                        <Button
                           variant="outline"
                           size="sm"
                           onClick={startNewChat}
                           disabled={isLoadingConversations || isSending}
                        >
                           New chat
                        </Button>
                        <Button
                           variant="ghost"
                           size="sm"
                           onClick={startNewImageChat}
                           disabled={isLoadingConversations || isSending}
                           className="flex items-center gap-2 border bg-white/4"
                        >
                           <ImageIcon className="h-4 w-4" aria-hidden />
                           Image chat
                        </Button>
                        <ThemeToggle className="shrink-0" />
                     </div>
                  </header>
                  {(error || globalError) && (
                     <p className="mt-2 text-sm text-destructive">
                        {error ?? globalError}
                     </p>
                  )}
                  <div className="mt-4 flex flex-1 flex-col">
                     <div className="mb-4 flex items-center gap-3 sm:hidden">
                        <select
                           value={activeConversationId ?? ''}
                           onChange={handleConversationChange}
                           disabled={isLoadingConversations}
                           className="flex-1 rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/50"
                        >
                           {conversations.length === 0 && (
                              <option value="" disabled>
                                 {isLoadingConversations
                                    ? 'Loading conversations...'
                                    : 'No conversations yet'}
                              </option>
                           )}
                           {conversations.map((conversation) => (
                              <option
                                 key={conversation.id}
                                 value={conversation.id}
                              >
                                 {conversation.title}
                                 {conversation.type === 'image'
                                    ? ' (Image)'
                                    : ''}
                              </option>
                           ))}
                        </select>
                        <Button
                           variant="outline"
                           size="sm"
                           onClick={startNewChat}
                           disabled={isLoadingConversations || isSending}
                        >
                           New chat
                        </Button>
                        <Button
                           variant="ghost"
                           size="sm"
                           onClick={startNewImageChat}
                           disabled={isLoadingConversations || isSending}
                           className="flex items-center gap-2"
                        >
                           <ImageIcon className="h-4 w-4" aria-hidden />
                           Image chat
                        </Button>
                        <ThemeToggle className="shrink-0" />
                     </div>
                     <div className="flex flex-1 min-h-0">
                        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col min-h-0">
                           <div className="flex-1 overflow-y-auto py-4 sm:py-6">
                              <ChatMessageList
                                 messages={messages}
                                 isLoading={isSending || isLoadingConversations}
                                 conversationType={activeConversationType}
                              />
                           </div>
                           <div className="mt-auto sticky bottom-0 z-10 pb-4 sm:pb-5">
                              <form
                                 onSubmit={handleSubmit}
                                 className="relative w-full"
                              >
                                 <Textarea
                                    ref={textareaRef}
                                    value={inputValue}
                                    onChange={(event) =>
                                       setInputValue(event.target.value)
                                    }
                                    onKeyDown={handleKeyDown}
                                    placeholder={inputPlaceholder}
                                    spellCheck
                                    rows={1}
                                    className="min-h-[50px] max-h-[150px] w-full resize-none overflow-y-auto rounded-3xl border border-border/50 bg-card/98 px-4 py-2.5 pr-16 text-base shadow-sm transition focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
                                    disabled={
                                       isSending ||
                                       isLoadingConversations ||
                                       !activeConversationId
                                    }
                                 />
                                 <Button
                                    type="submit"
                                    disabled={!canSubmit}
                                    size="icon"
                                    className="absolute top-1/2 right-1 h-10 w-10 -translate-y-1/2 rounded-full"
                                 >
                                    {activeConversationType === 'image' ? (
                                       <ImageIcon
                                          className="h-4 w-4"
                                          aria-hidden
                                       />
                                    ) : (
                                       <Send className="h-4 w-4" aria-hidden />
                                    )}
                                    <span className="sr-only">
                                       {activeConversationType === 'image'
                                          ? 'Generate image'
                                          : 'Send'}
                                    </span>
                                 </Button>
                              </form>
                           </div>
                        </div>
                     </div>
                  </div>
               </>
            )}
         </div>
      </div>
   );
}

function formatUpdatedAt(date: Date) {
   return new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
   }).format(date);
}
