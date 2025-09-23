export type ConversationRole = 'user' | 'assistant' | 'system';

export type ConversationMessage = {
   id: string;
   role: ConversationRole;
   content: string;
   createdAt: Date;
};

export type ConversationRecord = {
   id: string;
   title: string;
   createdAt: Date;
   updatedAt: Date;
   lastResponseId: string | null;
   messages: ConversationMessage[];
};

export const DEFAULT_CONVERSATION_TITLE = 'New chat';

const conversations = new Map<string, ConversationRecord>();

function ensureConversation(conversationId: string) {
   let conversation = conversations.get(conversationId);

   if (!conversation) {
      const now = new Date();
      conversation = {
         id: conversationId,
         title: DEFAULT_CONVERSATION_TITLE,
         createdAt: now,
         updatedAt: now,
         lastResponseId: null,
         messages: [],
      };

      conversations.set(conversationId, conversation);
   }

   return conversation;
}

export const conversationRepository = {
   ensure(conversationId: string) {
      return ensureConversation(conversationId);
   },

   get(conversationId: string) {
      return conversations.get(conversationId) ?? null;
   },

   list() {
      return Array.from(conversations.values());
   },

   create(conversationId: string) {
      return ensureConversation(conversationId);
   },

   addMessage(conversationId: string, message: ConversationMessage) {
      const conversation = ensureConversation(conversationId);

      conversation.messages.push(message);
      conversation.updatedAt = message.createdAt;
   },

   updateTitle(conversationId: string, title: string) {
      const conversation = ensureConversation(conversationId);

      if (!title.trim()) {
         return conversation;
      }

      conversation.title = title.trim();
      conversation.updatedAt = new Date();

      return conversation;
   },

   updateTitleIfDefault(conversationId: string, title: string) {
      const conversation = ensureConversation(conversationId);

      if (conversation.title === DEFAULT_CONVERSATION_TITLE && title.trim()) {
         conversation.title = title.trim();
         conversation.updatedAt = new Date();
      }

      return conversation;
   },

   getMessages(conversationId: string) {
      return ensureConversation(conversationId).messages;
   },

   getLastResponseId(conversationId: string) {
      return ensureConversation(conversationId).lastResponseId;
   },

   setLastResponseId(conversationId: string, responseId: string) {
      const conversation = ensureConversation(conversationId);
      conversation.lastResponseId = responseId;
      conversation.updatedAt = new Date();
   },
};
