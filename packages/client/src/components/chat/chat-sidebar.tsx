import { MoreVertical, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { ChatConversation } from '@/types/chat';

type ChatSidebarProps = {
   conversations: ChatConversation[];
   activeConversationId: string | null;
   onSelectConversation: (conversationId: string) => void;
   onNewConversation: () => void;
   onDeleteConversation: (conversationId: string) => Promise<void> | void;
};

export function ChatSidebar({
   conversations,
   activeConversationId,
   onSelectConversation,
   onNewConversation,
   onDeleteConversation,
}: ChatSidebarProps) {
   return (
      <aside className="hidden w-72 flex-col border-r border-border/75 bg-card/50 py-6 shadow-sm sm:fixed sm:inset-y-0 sm:left-0 sm:z-30 sm:flex sm:overflow-y-auto">
         <div className="mb-6 flex items-center justify-between gap-2 px-4">
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
         <div className="flex-1 overflow-y-auto px-0.5">
            {conversations.length === 0 ? (
               <div className="rounded-md border border-dashed border-border/60 bg-muted/40 p-4 text-xs text-muted-foreground">
                  Your conversations will appear here.
               </div>
            ) : (
               <ul className="space-y-2">
                  {conversations.map((conversation) => {
                     const isActive = conversation.id === activeConversationId;

                     return (
                        <li key={conversation.id} className="relative group">
                           <button
                              type="button"
                              onClick={() =>
                                 onSelectConversation(conversation.id)
                              }
                              className={cn(
                                 'w-full cursor-pointer rounded-lg border border-transparent px-3 py-2 pr-10 text-left text-sm transition-colors',
                                 'hover:bg-muted/100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 group-hover:bg-muted/100',
                                 isActive
                                    ? 'border-black/10 bg-muted/70 text-foreground shadow-sm'
                                    : 'text-muted-foreground'
                              )}
                              aria-current={isActive ? 'true' : undefined}
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
                           <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                 <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-1 top-1/2 size-9 -translate-y-1/2 text-muted-foreground opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 group-hover:opacity-100 data-[state=open]:opacity-100"
                                    aria-label={`Open actions for ${conversation.title}`}
                                 >
                                    <MoreVertical className="size-5" />
                                    <span className="sr-only">
                                       Open conversation menu
                                    </span>
                                 </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                 align="end"
                                 className="w-48"
                                 sideOffset={6}
                              >
                                 <DropdownMenuItem
                                    className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                                    onSelect={() => {
                                       void onDeleteConversation(
                                          conversation.id
                                       );
                                    }}
                                 >
                                    <Trash2 className="size-4" aria-hidden />
                                    <span>Delete chat</span>
                                 </DropdownMenuItem>
                              </DropdownMenuContent>
                           </DropdownMenu>
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
