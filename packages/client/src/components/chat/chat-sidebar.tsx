import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ChatConversation } from '@/types/chat';

type ChatSidebarProps = {
   conversations: ChatConversation[];
   activeConversationId: string | null;
   onSelectConversation: (conversationId: string) => void;
   onNewConversation: () => void;
};

export function ChatSidebar({
   conversations,
   activeConversationId,
   onSelectConversation,
   onNewConversation,
}: ChatSidebarProps) {
   return (
      <aside className="hidden w-72 flex-col border-r bg-card/70 px-4 py-6 shadow-sm sm:flex">
         <div className="mb-6 flex items-center justify-between gap-2">
            <div className="flex flex-col">
               <h2 className="text-sm font-semibold text-muted-foreground">
                  Conversations
               </h2>
               <span className="text-xs text-muted-foreground/80">
                  Revisit previous threads or start a new one.
               </span>
            </div>
            <Button
               size="icon"
               onClick={onNewConversation}
               aria-label="Start new chat"
            >
               <Plus className="size-4" />
            </Button>
         </div>
         <div className="flex-1 overflow-y-auto pr-1">
            {conversations.length === 0 ? (
               <div className="rounded-md border border-dashed border-border/60 bg-muted/40 p-4 text-xs text-muted-foreground">
                  Your conversations will appear here.
               </div>
            ) : (
               <ul className="space-y-2">
                  {conversations.map((conversation) => {
                     const isActive = conversation.id === activeConversationId;

                     return (
                        <li key={conversation.id}>
                           <button
                              type="button"
                              onClick={() =>
                                 onSelectConversation(conversation.id)
                              }
                              className={cn(
                                 'w-full rounded-lg border border-transparent px-3 py-2 text-left text-sm transition-colors',
                                 'hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                                 isActive
                                    ? 'bg-primary/10 text-foreground shadow-sm ring-1 ring-primary/20'
                                    : 'bg-card text-muted-foreground'
                              )}
                           >
                              <div className="flex items-center justify-between gap-3">
                                 <span className="truncate font-medium text-foreground">
                                    {conversation.title}
                                 </span>
                                 <time
                                    className="shrink-0 text-xs text-muted-foreground"
                                    dateTime={conversation.updatedAt.toISOString()}
                                 >
                                    {formatTimestamp(conversation.updatedAt)}
                                 </time>
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">
                                 {conversation.messageCount > 0
                                    ? `${conversation.messageCount} message${conversation.messageCount === 1 ? '' : 's'}`
                                    : 'No messages yet'}
                              </p>
                           </button>
                        </li>
                     );
                  })}
               </ul>
            )}
         </div>
      </aside>
   );
}

function formatTimestamp(date: Date) {
   return new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
   }).format(date);
}
