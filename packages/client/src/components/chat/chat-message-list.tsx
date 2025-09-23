import { useEffect, useRef } from 'react';

import { ChatMessageItem, ThinkingMessage } from './chat-message';
import type { ChatMessage } from '@/types/chat';

type ChatMessageListProps = {
   messages: ChatMessage[];
   isLoading: boolean;
};

export function ChatMessageList({ messages, isLoading }: ChatMessageListProps) {
   const endRef = useRef<HTMLDivElement | null>(null);

   useEffect(() => {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
   }, [messages.length, isLoading]);

   if (messages.length === 0 && !isLoading) {
      return (
         <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
            <h2 className="mb-1 text-lg font-semibold text-foreground">
               Start a conversation
            </h2>
            <p className="max-w-[48ch] text-sm">What is on your mind, buddy?</p>
         </div>
      );
   }

   return (
      <div className="flex h-full flex-col gap-4">
         {messages.map((message) => (
            <ChatMessageItem key={message.id} message={message} />
         ))}
         {isLoading && <ThinkingMessage />}
         <div ref={endRef} />
      </div>
   );
}
