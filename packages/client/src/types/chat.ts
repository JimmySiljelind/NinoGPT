export type ChatRole = 'user' | 'assistant' | 'system';

export type ChatMessage = {
   id: string;
   role: ChatRole;
   content: string;
   createdAt: Date;
};

export type ChatConversationType = 'text' | 'image';

export const DEFAULT_TEXT_CONVERSATION_TITLE = 'New chat';
export const DEFAULT_IMAGE_CONVERSATION_TITLE = 'New image chat';

export type ChatConversation = {
   id: string;
   title: string;
   type: ChatConversationType;
   createdAt: Date;
   updatedAt: Date;
   messageCount: number;
   projectId: string | null;
   archivedAt: Date | null;
};

export type ChatConversationDetail = ChatConversation & {
   messages: ChatMessage[];
};
