export type ChatRole = 'user' | 'assistant' | 'system';

export type ChatMessage = {
   id: string;
   role: ChatRole;
   content: string;
   createdAt: Date;
};

export type ChatConversation = {
   id: string;
   title: string;
   createdAt: Date;
   updatedAt: Date;
   messageCount: number;
   projectId: string | null;
   archivedAt: Date | null;
};

export type ChatConversationDetail = ChatConversation & {
   messages: ChatMessage[];
};
