import { Fragment, useCallback } from 'react';
import { Download } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { ChatConversationType, ChatMessage } from '@/types/chat';
import { MessageContent } from './message-content';

type MessageSegment =
   | { type: 'text'; content: string }
   | { type: 'code'; content: string; language?: string };

function parseMessageSegments(input: string): MessageSegment[] {
   const raw = input.replace(/\r\n/g, '\n');
   const segments: MessageSegment[] = [];
   const codeFence = /```([^\n]*)?\n([\s\S]*?)```/g;

   let lastIndex = 0;
   let match: RegExpExecArray | null = null;

   while ((match = codeFence.exec(raw)) !== null) {
      const [fullMatch, lang, code] = match;
      const matchStart = match.index;

      if (matchStart > lastIndex) {
         const text = raw.slice(lastIndex, matchStart);
         if (text.trim().length > 0 || text.includes('\n')) {
            segments.push({ type: 'text', content: text });
         }
      }

      segments.push({
         type: 'code',
         content: code.replace(/\s+$/, ''),
         language: lang?.trim() || undefined,
      });

      lastIndex = matchStart + fullMatch.length;
   }

   if (lastIndex < raw.length) {
      const remainder = raw.slice(lastIndex);
      if (remainder.trim().length > 0 || remainder.includes('\n')) {
         segments.push({ type: 'text', content: remainder });
      }
   }

   if (segments.length === 0) {
      segments.push({ type: 'text', content: raw });
   }

   return segments;
}

function formatTimestamp(date: Date) {
   return new Intl.DateTimeFormat('en', {
      hour: 'numeric',
      minute: '2-digit',
   }).format(date);
}

type ChatMessageItemProps = {
   message: ChatMessage;
   conversationType: ChatConversationType;
};

export function ChatMessageItem({
   message,
   conversationType,
}: ChatMessageItemProps) {
   const isSystem = message.role === 'system';
   const isUser = message.role === 'user';
   const shouldRenderImage =
      conversationType === 'image' &&
      message.role === 'assistant' &&
      message.content.startsWith('data:image');
   const bubbleClasses = cn(
      'max-w-[70ch] rounded-2xl px-4 py-3 text-sm shadow-sm flex flex-col gap-3',
      isUser
         ? 'bg-primary text-primary-foreground rounded-br-md'
         : 'bg-muted text-foreground rounded-bl-md',
      shouldRenderImage && !isUser ? 'bg-transparent p-0 shadow-none' : ''
   );

   const handleDownloadImage = useCallback(() => {
      if (!shouldRenderImage || typeof window === 'undefined') {
         return;
      }

      try {
         const link = document.createElement('a');
         link.href = message.content;

         const extensionMatch = /^data:image\/([a-zA-Z0-9+]+);/i.exec(
            message.content
         );
         const extension = extensionMatch?.[1] ?? 'png';
         const iso = message.createdAt.toISOString().replace(/[:.]/g, '-');
         link.download = `nino-image-${iso}.${extension}`;

         document.body.appendChild(link);
         link.click();
         document.body.removeChild(link);
      } catch (error) {
         console.error('Failed to download image', error);
      }
   }, [message.content, message.createdAt, shouldRenderImage]);

   if (isSystem) {
      return (
         <div className="flex justify-center">
            <div className="max-w-[42ch] rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
               {message.content}
            </div>
         </div>
      );
   }

   const timestamp = formatTimestamp(message.createdAt);
   const segments = shouldRenderImage
      ? []
      : parseMessageSegments(message.content);

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
            <div className={bubbleClasses}>
               {shouldRenderImage ? (
                  <>
                     <figure className="relative overflow-hidden rounded-xl border border-border/60 bg-card">
                        <img
                           src={message.content}
                           alt="Generated image"
                           className="h-auto w-full object-cover"
                        />
                     </figure>
                     <div className="flex justify-end">
                        <button
                           type="button"
                           onClick={handleDownloadImage}
                           className="inline-flex items-center gap-2 rounded-md border bg-card/80 px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-card/60 cursor-pointer"
                        >
                           <Download className="size-4" aria-hidden />
                           <span>Download</span>
                        </button>
                     </div>
                  </>
               ) : (
                  segments.map((segment, index) => (
                     <Fragment key={`${segment.type}-${index}`}>
                        {segment.type === 'text' ? (
                           <MessageContent content={segment.content} />
                        ) : (
                           <figure className="relative overflow-hidden rounded-xl bg-[#151515] text-slate-100 shadow-inner ring-1 ring-zinc-700/40">
                              {segment.language && (
                                 <figcaption className="absolute right-3 top-2 text-[0.65rem] uppercase tracking-wider text-slate-400">
                                    {segment.language}
                                 </figcaption>
                              )}
                              <pre className="max-h-[28rem] overflow-auto px-4 pb-4 pt-6 text-[0.8rem] leading-relaxed">
                                 <code className="font-mono">
                                    {segment.content}
                                 </code>
                              </pre>
                           </figure>
                        )}
                     </Fragment>
                  ))
               )}
            </div>
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

type ThinkingMessageProps = {
   label?: string;
};

export function ThinkingMessage({ label }: ThinkingMessageProps) {
   return (
      <div className="flex w-full items-start gap-3">
         <MessageAvatar role="assistant" />
         <div className="rounded-2xl bg-muted px-4 py-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
               <span className="size-2 animate-pulse rounded-full bg-muted-foreground" />
               <span>{label ?? 'Thinking...'}</span>
            </span>
         </div>
      </div>
   );
}
