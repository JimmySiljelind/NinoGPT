import { useCallback, useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';

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
import { ChatMessageList } from '@/components/chat/chat-message-list';
import { useChat } from '@/hooks/useChat';

function App() {
   const { messages, isSending, sendMessage, resetChat, error } = useChat();
   const [inputValue, setInputValue] = useState('');

   const canSubmit = inputValue.trim().length > 0 && !isSending;

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

   return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
         <div className="container mx-auto flex min-h-screen max-w-4xl flex-col px-4 py-10">
            <Card className="flex flex-1 flex-col">
               <CardHeader className="border-b">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                     <div>
                        <CardTitle className="text-2xl font-semibold">
                           BuddyGPT
                        </CardTitle>
                        <CardDescription>
                           Chat with your own artificial friend.
                        </CardDescription>
                     </div>
                     <Button
                        variant="outline"
                        size="sm"
                        onClick={resetChat}
                        disabled={messages.length === 0 && !error}
                     >
                        Start new chat
                     </Button>
                  </div>
                  {error && (
                     <p className="mt-3 text-sm text-destructive">{error}</p>
                  )}
               </CardHeader>
               <CardContent className="flex-1 overflow-y-auto p-6">
                  <ChatMessageList messages={messages} isLoading={isSending} />
               </CardContent>
               <CardFooter className="border-t bg-card/60 p-4">
                  <form
                     onSubmit={handleSubmit}
                     className="flex w-full flex-col gap-3 sm:flex-row sm:items-end"
                  >
                     <Textarea
                        value={inputValue}
                        onChange={(event) => setInputValue(event.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask anything"
                        spellCheck
                        rows={3}
                        disabled={isSending}
                     />
                     <div className="flex items-center gap-2 self-end sm:self-auto">
                        <Button type="submit" disabled={!canSubmit}>
                           {isSending ? 'Sending...' : 'Send'}
                        </Button>
                     </div>
                  </form>
               </CardFooter>
            </Card>
         </div>
      </div>
   );
}

export default App;
