import { useCallback, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent, KeyboardEvent } from 'react';

import { ChatMessageList } from '@/components/chat/chat-message-list';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useChat } from '@/hooks/useChat';

function App() {
   const {
      conversations,
      activeConversationId,
      messages,
      isSending,
      isLoadingConversations,
      error,
      globalError,
      sendMessage,
      startNewConversation,
      deleteConversation,
      selectConversation,
   } = useChat();
   const [inputValue, setInputValue] = useState('');

   const activeConversation = useMemo(
      () =>
         conversations.find(
            (conversation) => conversation.id === activeConversationId
         ) ?? null,
      [conversations, activeConversationId]
   );

   const canSubmit =
      inputValue.trim().length > 0 &&
      !isSending &&
      !isLoadingConversations &&
      Boolean(activeConversationId);

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
      void startNewConversation();
   }, [startNewConversation]);

   const headerMessage = (() => {
      if (isLoadingConversations) {
         return 'Loading conversations...';
      }

      if (activeConversation) {
         return `Last updated ${formatUpdatedAt(activeConversation.updatedAt)}`;
      }

      return 'Start a conversation to begin.';
   })();

   return (
      <div className="min-h-screen bg-background sm:pl-72">
         <ChatSidebar
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelectConversation={selectConversation}
            onNewConversation={startNewChat}
            onDeleteConversation={deleteConversation}
         />
         <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
            <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
               <div>
                  <h1 className="text-3xl font-semibold text-foreground">
                     NinoGPT
                  </h1>
                  <p className="text-sm text-muted-foreground">
                     {headerMessage}
                  </p>
               </div>
               <div className="hidden items-center gap-2 sm:flex">
                  <ThemeToggle className="shrink-0" />
                  <Button
                     variant="outline"
                     size="sm"
                     onClick={startNewChat}
                     disabled={isLoadingConversations || isSending}
                  >
                     New chat
                  </Button>
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
                        <option key={conversation.id} value={conversation.id}>
                           {conversation.title}
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
                  <ThemeToggle className="shrink-0" />
               </div>
               <div className="flex-1 overflow-hidden">
                  <div className="mx-auto flex h-full w-full max-w-3xl flex-col">
                     <div className="flex-1 overflow-y-auto py-4 sm:py-6">
                        <ChatMessageList
                           messages={messages}
                           isLoading={isSending || isLoadingConversations}
                        />
                     </div>
                     <div className="border-t border-border/60 bg-background/95 p-4 sm:p-6">
                        <form
                           onSubmit={handleSubmit}
                           className="flex w-full items-end gap-3"
                        >
                           <Textarea
                              value={inputValue}
                              onChange={(event) =>
                                 setInputValue(event.target.value)
                              }
                              onKeyDown={handleKeyDown}
                              placeholder="Ask anything"
                              spellCheck
                              rows={3}
                              className="min-h-[56px] flex-1 resize-none"
                              disabled={
                                 isSending ||
                                 isLoadingConversations ||
                                 !activeConversationId
                              }
                           />
                           <Button type="submit" disabled={!canSubmit}>
                              {isSending ? 'Sending...' : 'Send'}
                           </Button>
                        </form>
                     </div>
                  </div>
               </div>
            </div>
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

export default App;
