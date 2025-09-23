import type { ChatMessage } from '@/types/chat';
import { cn } from '@/lib/utils';

function formatTimestamp(date: Date) {
   return new Intl.DateTimeFormat('en', {
      hour: 'numeric',
      minute: '2-digit',
   }).format(date);
}

export function ChatMessageItem({ message }: { message: ChatMessage }) {
   if (message.role === 'system') {
      return (
         <div className="flex justify-center">
            <div className="max-w-[42ch] rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
               {message.content}
            </div>
         </div>
      );
   }

   const isUser = message.role === 'user';
   const bubbleClasses = cn(
      'max-w-[70ch] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm shadow-sm',
      isUser
         ? 'bg-primary text-primary-foreground rounded-br-md'
         : 'bg-muted text-foreground rounded-bl-md'
   );

   const timestamp = formatTimestamp(message.createdAt);

   return (
      <div
         className={cn(
            'flex w-full gap-3',
            isUser ? 'justify-end' : 'justify-start'
         )}
      >
         {!isUser && <MessageAvatar role={message.role} />}
         <div
            className={cn(
               'flex flex-col gap-1',
               isUser ? 'items-end' : 'items-start'
            )}
         >
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
               <span>{isUser ? 'You' : 'Assistant'}</span>
               <span aria-hidden="true">|</span>
               <time
                  className="tabular-nums"
                  dateTime={message.createdAt.toISOString()}
               >
                  {timestamp}
               </time>
            </div>
            <div className={bubbleClasses}>{message.content}</div>
         </div>
         {isUser && <MessageAvatar role={message.role} />}
      </div>
   );
}

function MessageAvatar({ role }: { role: ChatMessage['role'] }) {
   const label = role === 'user' ? 'You' : 'AI';
   return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold uppercase text-secondary-foreground">
         {label.slice(0, 2)}
      </div>
   );
}

export function ThinkingMessage() {
   return (
      <div className="flex w-full items-start gap-3">
         <MessageAvatar role="assistant" />
         <div className="rounded-2xl bg-muted px-4 py-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
               <span className="size-2 animate-pulse rounded-full bg-muted-foreground" />
               <span>Thinking...</span>
            </span>
         </div>
      </div>
   );
}
