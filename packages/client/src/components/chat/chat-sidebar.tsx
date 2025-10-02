import { useEffect, useMemo, useState } from 'react';
import {
   Check,
   ChevronDown,
   ChevronRight,
   Folder,
   FolderPlus,
   LogOut,
   MoreVertical,
   Pencil,
   Plus,
   Settings,
   Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { RenameDialog } from '@/components/chat/rename-dialog';
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuLabel,
   DropdownMenuSeparator,
   DropdownMenuSub,
   DropdownMenuSubContent,
   DropdownMenuSubTrigger,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { ChatConversation } from '@/types/chat';
import type { ChatProject } from '@/types/project';

type ChatSidebarProps = {
   conversations: ChatConversation[];
   projects: ChatProject[];
   activeConversationId: string | null;
   onSelectConversation: (conversationId: string) => void;
   onNewConversation: () => void;
   onDeleteConversation: (conversationId: string) => Promise<void> | void;
   onCreateProject: (name: string) => Promise<ChatProject> | ChatProject;
   onRenameProject: (projectId: string, name: string) => Promise<void> | void;
   onDeleteProject: (projectId: string) => Promise<void> | void;
   onRenameConversation: (
      conversationId: string,
      title: string
   ) => Promise<void> | void;
   onAssignConversationToProject: (
      conversationId: string,
      projectId: string | null
   ) => Promise<void> | void;
   currentUserName: string;
   currentUserEmail: string;
   onLogout: () => Promise<void> | void;
};

type RenameTarget =
   | { type: 'project'; project: ChatProject }
   | { type: 'conversation'; conversation: ChatConversation };

const PROJECT_PROMPT_MESSAGE =
   'Delete this project and all chats saved inside it? This action cannot be undone.';

export function ChatSidebar({
   conversations,
   projects,
   activeConversationId,
   onSelectConversation,
   onNewConversation,
   onDeleteConversation,
   onCreateProject,
   onRenameProject,
   onDeleteProject,
   onRenameConversation,
   onAssignConversationToProject,
   currentUserName,
   currentUserEmail,
   onLogout,
}: ChatSidebarProps) {
   const [expandedProjects, setExpandedProjects] = useState<
      Record<string, boolean>
   >({});
   const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null);
   const [renameError, setRenameError] = useState<string | null>(null);
   const [isRenaming, setIsRenaming] = useState(false);

   useEffect(() => {
      setExpandedProjects((prev) => {
         const next = { ...prev };
         let changed = false;

         for (const project of projects) {
            if (!(project.id in next)) {
               next[project.id] = false;
               changed = true;
            }
         }

         for (const key of Object.keys(next)) {
            if (!projects.some((project) => project.id === key)) {
               delete next[key];
               changed = true;
            }
         }

         return changed ? next : prev;
      });
   }, [projects]);

   const conversationsByProject = useMemo(() => {
      const map = new Map<string | null, ChatConversation[]>();

      for (const conversation of conversations) {
         const key = conversation.projectId ?? null;
         const list = map.get(key) ?? [];
         list.push(conversation);
         map.set(key, list);
      }

      return map;
   }, [conversations]);

   const totalConversations = conversations.length;
   const unassignedConversations = conversationsByProject.get(null) ?? [];

   const resetRenameState = () => {
      setRenameTarget(null);
      setRenameError(null);
   };

   const handleRenameSubmit = async (value: string) => {
      if (!renameTarget) {
         return;
      }

      const trimmed = value.trim();
      if (!trimmed) {
         setRenameError('Name cannot be empty.');
         return;
      }

      const currentName =
         renameTarget.type === 'project'
            ? renameTarget.project.name
            : renameTarget.conversation.title;

      if (trimmed === currentName) {
         resetRenameState();
         return;
      }

      setRenameError(null);
      setIsRenaming(true);

      try {
         if (renameTarget.type === 'project') {
            await Promise.resolve(
               onRenameProject(renameTarget.project.id, trimmed)
            );
         } else {
            await Promise.resolve(
               onRenameConversation(renameTarget.conversation.id, trimmed)
            );
         }
         resetRenameState();
      } catch (error) {
         console.error('Failed to rename item.', error);
         setRenameError('We could not save the new name. Please try again.');
      } finally {
         setIsRenaming(false);
      }
   };

   const handleRenameCancel = () => {
      if (isRenaming) {
         return;
      }
      resetRenameState();
   };

   const openRenameProjectDialog = (project: ChatProject) => {
      setRenameError(null);
      setRenameTarget({ type: 'project', project });
   };

   const openRenameConversationDialog = (conversation: ChatConversation) => {
      setRenameError(null);
      setRenameTarget({ type: 'conversation', conversation });
   };

   const handleCreateProjectClick = () => {
      const name = window.prompt('Create project', '');

      if (!name || !name.trim()) {
         return;
      }

      void Promise.resolve(onCreateProject(name.trim())).catch((error) => {
         console.error('Failed to create project.', error);
      });
   };

   const handleRenameProject = (project: ChatProject) => {
      openRenameProjectDialog(project);
   };

   const handleDeleteProjectClick = (project: ChatProject) => {
      const confirmed = window.confirm(PROJECT_PROMPT_MESSAGE);

      if (!confirmed) {
         return;
      }

      void onDeleteProject(project.id);
   };

   const toggleProject = (projectId: string) => {
      setExpandedProjects((prev) => ({
         ...prev,
         [projectId]: !(prev[projectId] ?? true),
      }));
   };

   const renderConversation = (conversation: ChatConversation) => {
      const isActive = conversation.id === activeConversationId;

      const handleAssign = (projectId: string | null) => {
         if (conversation.projectId === projectId) {
            return;
         }

         void onAssignConversationToProject(conversation.id, projectId);
      };

      const handleCreateProjectForConversation = async () => {
         const name = window.prompt('Create project', '');

         if (!name || !name.trim()) {
            return;
         }

         try {
            const created = await onCreateProject(name.trim());
            await onAssignConversationToProject(conversation.id, created.id);
         } catch (error) {
            console.error('Failed to create project from conversation.', error);
         }
      };

      const handleRenameConversation = () => {
         openRenameConversationDialog(conversation);
      };

      return (
         <li key={conversation.id} className="relative group">
            <button
               type="button"
               onClick={() => onSelectConversation(conversation.id)}
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
                     <span className="sr-only">Open conversation menu</span>
                  </Button>
               </DropdownMenuTrigger>
               <DropdownMenuContent align="end" className="w-56" sideOffset={6}>
                  <DropdownMenuItem
                     className="cursor-pointer gap-2"
                     onSelect={handleRenameConversation}
                  >
                     <Pencil className="size-4" aria-hidden />
                     <span>Rename chat</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                     className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                     onSelect={() => {
                        void onDeleteConversation(conversation.id);
                     }}
                  >
                     <Trash2 className="size-4" aria-hidden />
                     <span>Delete chat</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                     <DropdownMenuSubTrigger className="cursor-pointer gap-2">
                        <Folder className="size-4" aria-hidden />
                        <span>Save to Project</span>
                     </DropdownMenuSubTrigger>
                     <DropdownMenuSubContent className="w-56">
                        <DropdownMenuItem
                           className="cursor-pointer gap-2"
                           onSelect={() => {
                              void handleCreateProjectForConversation();
                           }}
                        >
                           <FolderPlus className="size-4" aria-hidden />
                           <span>Create project</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                           className="cursor-pointer gap-2"
                           onSelect={() => handleAssign(null)}
                        >
                           <Check
                              className={cn(
                                 'size-4',
                                 conversation.projectId === null
                                    ? 'opacity-100'
                                    : 'opacity-0'
                              )}
                              aria-hidden
                           />
                           <span>No project</span>
                        </DropdownMenuItem>
                        {projects.length === 0 ? (
                           <DropdownMenuItem disabled className="gap-2">
                              <FolderPlus className="size-4" aria-hidden />
                              <span>No projects yet</span>
                           </DropdownMenuItem>
                        ) : (
                           projects.map((project) => (
                              <DropdownMenuItem
                                 key={project.id}
                                 className="cursor-pointer gap-2"
                                 onSelect={() => handleAssign(project.id)}
                              >
                                 <Check
                                    className={cn(
                                       'size-4',
                                       conversation.projectId === project.id
                                          ? 'opacity-100'
                                          : 'opacity-0'
                                    )}
                                    aria-hidden
                                 />
                                 <span>{project.name}</span>
                              </DropdownMenuItem>
                           ))
                        )}
                     </DropdownMenuSubContent>
                  </DropdownMenuSub>
               </DropdownMenuContent>
            </DropdownMenu>
         </li>
      );
   };
   const renameDialogConfig = renameTarget
      ? renameTarget.type === 'project'
         ? {
              title: 'Rename project',
              description:
                 'Update the project name to keep your workspace organized',
              confirmLabel: 'Save',
              initialValue: renameTarget.project.name,
           }
         : {
              title: 'Rename chat',
              description: 'Choose a title for this conversation',
              confirmLabel: 'Save',
              initialValue: renameTarget.conversation.title,
           }
      : null;

   return (
      <aside className="hidden w-72 flex-col border-r border-border/75 bg-card/50 py-6 shadow-sm sm:fixed sm:inset-y-0 sm:left-0 sm:z-30 sm:flex sm:max-h-screen sm:overflow-hidden">
         <div className="mb-6 flex items-center justify-between gap-2 px-4">
            <div className="flex flex-col">
               <h2 className="text-sm font-semibold text-muted-foreground">
                  Conversations
               </h2>
               <span className="text-xs text-muted-foreground/80">
                  Revisit previous threads or start a new one.
               </span>
            </div>
            <div className="flex items-center gap-2">
               <Button
                  size="icon"
                  onClick={onNewConversation}
                  aria-label="Start new chat"
               >
                  <Plus className="size-4" />
               </Button>
               <Button
                  size="icon"
                  variant="outline"
                  onClick={handleCreateProjectClick}
                  aria-label="Create project"
               >
                  <FolderPlus className="size-4" />
               </Button>
            </div>
         </div>
         <div className="flex-1 overflow-y-auto px-0.5">
            <div
               className={cn(
                  'mt-6 space-y-3 mb-4',
                  totalConversations === 0 ? 'mt-0' : ''
               )}
            >
               <div className="flex items-center justify-between px-4">
                  <h3 className="text-xs font-semibold uppercase text-muted-foreground/70">
                     Projects
                  </h3>
               </div>
               {projects.length === 0 ? (
                  <p className="px-4 text-xs text-muted-foreground/80">
                     Create a project to organize chats.
                  </p>
               ) : (
                  <ul className="space-y-2 px-0.5">
                     {projects.map((project) => {
                        const conversationList =
                           conversationsByProject.get(project.id) ?? [];
                        const isExpanded = expandedProjects[project.id] ?? true;

                        return (
                           <li
                              key={project.id}
                              className="rounded-lg border border-border/60 bg-card/60 shadow-sm"
                           >
                              <div className="flex items-center">
                                 <button
                                    type="button"
                                    onClick={() => toggleProject(project.id)}
                                    className="flex flex-1 items-center gap-2 rounded-l-lg px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 cursor-pointer"
                                    aria-expanded={isExpanded}
                                 >
                                    {isExpanded ? (
                                       <ChevronDown className="size-4 text-muted-foreground" />
                                    ) : (
                                       <ChevronRight className="size-4 text-muted-foreground" />
                                    )}
                                    <span className="flex-1 truncate">
                                       {project.name}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                       {conversationList.length} chat
                                       {conversationList.length === 1
                                          ? ''
                                          : 's'}
                                    </span>
                                 </button>
                                 <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                       <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="mr-1 size-8 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                                          aria-label={`Open actions for project ${project.name}`}
                                       >
                                          <MoreVertical className="size-4" />
                                          <span className="sr-only">
                                             Open project menu
                                          </span>
                                       </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                       align="end"
                                       className="w-44"
                                       sideOffset={6}
                                    >
                                       <DropdownMenuItem
                                          className="cursor-pointer gap-2"
                                          onSelect={() =>
                                             handleRenameProject(project)
                                          }
                                       >
                                          <Pencil
                                             className="size-4"
                                             aria-hidden
                                          />
                                          <span>Rename</span>
                                       </DropdownMenuItem>
                                       <DropdownMenuItem
                                          className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                                          onSelect={() =>
                                             handleDeleteProjectClick(project)
                                          }
                                       >
                                          <Trash2
                                             className="size-4"
                                             aria-hidden
                                          />
                                          <span>Delete</span>
                                       </DropdownMenuItem>
                                    </DropdownMenuContent>
                                 </DropdownMenu>
                              </div>
                              {isExpanded && (
                                 <ul className="space-y-2 px-2 pb-3 pt-2">
                                    {conversationList.length === 0 ? (
                                       <li className="rounded-md border border-dashed border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                                          No chats saved here yet.
                                       </li>
                                    ) : (
                                       conversationList.map(renderConversation)
                                    )}
                                 </ul>
                              )}
                           </li>
                        );
                     })}
                  </ul>
               )}
            </div>
            {totalConversations === 0 ? (
               <div className="rounded-md border border-dashed border-border/60 bg-muted/40 p-4 text-xs text-muted-foreground">
                  Your conversations will appear here.
               </div>
            ) : (
               unassignedConversations.length > 0 && (
                  <div>
                     <h3 className="px-4 text-xs font-semibold uppercase text-muted-foreground/70">
                        Unassigned
                     </h3>
                     <ul className="mt-2 space-y-2">
                        {unassignedConversations.map(renderConversation)}
                     </ul>
                  </div>
               )
            )}
         </div>
         <div className="mt-6 px-1 pt-4">
            <DropdownMenu>
               <DropdownMenuTrigger asChild>
                  <Button
                     type="button"
                     variant="ghost"
                     className="w-full justify-between border text-left text-sm hover:border-border/60 focus-visible:ring-0  pb-6 pt-5"
                     aria-label={`Open account menu for ${currentUserName}`}
                  >
                     <div className="flex flex-col">
                        <span className="font-medium text-foreground">
                           {currentUserName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                           {currentUserEmail}
                        </span>
                     </div>
                     <ChevronRight className="size-4 text-muted-foreground" />
                  </Button>
               </DropdownMenuTrigger>
               <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuLabel>
                     <div className="text-sm font-medium text-foreground">
                        {currentUserName}
                     </div>
                     <div className="text-xs text-muted-foreground">
                        {currentUserEmail}
                     </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer gap-2">
                     <Settings className="size-4" aria-hidden />
                     <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                     className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                     onSelect={() => {
                        void onLogout();
                     }}
                  >
                     <LogOut className="size-4" aria-hidden />
                     <span>Log out</span>
                  </DropdownMenuItem>
               </DropdownMenuContent>
            </DropdownMenu>
         </div>
         <RenameDialog
            open={Boolean(renameTarget)}
            title={renameDialogConfig?.title ?? 'Rename'}
            description={renameDialogConfig?.description}
            initialValue={renameDialogConfig?.initialValue ?? ''}
            confirmLabel={renameDialogConfig?.confirmLabel ?? 'Save'}
            isSubmitting={isRenaming}
            error={renameError}
            onSubmit={handleRenameSubmit}
            onCancel={handleRenameCancel}
         />
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
