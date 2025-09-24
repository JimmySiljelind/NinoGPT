import { useCallback, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent, KeyboardEvent } from 'react';

import { ChatMessageList } from '@/components/chat/chat-message-list';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import {
   Card,
   CardContent,
   CardDescription,
   CardFooter,
   CardHeader,
   CardTitle,
} from '@/components/ui/card';
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
      <div className="min-h-screen bg-background">
         <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex flex-1 flex-col gap-6 sm:flex-row">
               <ChatSidebar
                  conversations={conversations}
                  activeConversationId={activeConversationId}
                  onSelectConversation={selectConversation}
                  onNewConversation={startNewChat}
               />
               <section className="flex flex-1 flex-col">
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
                  <Card className="flex flex-1 flex-col">
                     <CardHeader className="rounded-xs border-b border-border/75 bg-card/80">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                           <div>
                              <CardTitle className="text-2xl font-semibold text-foreground">
                                 NinoGPT
                              </CardTitle>
                              <CardDescription>{headerMessage}</CardDescription>
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
                        </div>
                        {(error || globalError) && (
                           <p className="mt-3 text-sm text-destructive">
                              {error ?? globalError}
                           </p>
                        )}
                     </CardHeader>
                     <CardContent className="flex-1 overflow-y-auto p-6">
                        <ChatMessageList
                           messages={messages}
                           isLoading={isSending || isLoadingConversations}
                        />
                     </CardContent>
                     <CardFooter className="border-t bg-card/60 p-4">
                        <form
                           onSubmit={handleSubmit}
                           className="flex w-full flex-col gap-3 sm:flex-row sm:items-end"
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
                              disabled={
                                 isSending ||
                                 isLoadingConversations ||
                                 !activeConversationId
                              }
                           />
                           <div className="flex items-center gap-2 self-end sm:self-auto">
                              <Button type="submit" disabled={!canSubmit}>
                                 {isSending ? 'Sending...' : 'Send'}
                              </Button>
                           </div>
                        </form>
                     </CardFooter>
                  </Card>
               </section>
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
