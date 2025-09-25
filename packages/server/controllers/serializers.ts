import type {
   ConversationMessage,
   ConversationRecord,
} from '../repositories/conversation.repository';

type SerializedConversationMessage = {
   id: string;
   role: ConversationMessage['role'];
   content: string;
   createdAt: string;
};

type SerializedConversationSummary = {
   id: string;
   title: string;
   createdAt: string;
   updatedAt: string;
   messageCount: number;
};

type SerializedConversation = SerializedConversationSummary & {
   messages: SerializedConversationMessage[];
};

export function serializeConversationMessage(
   message: ConversationMessage
): SerializedConversationMessage {
   return {
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
   };
}

export function serializeConversationSummary(
   conversation: ConversationRecord
): SerializedConversationSummary {
   return {
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      messageCount: conversation.messages.length,
   };
}

export function serializeConversation(
   conversation: ConversationRecord
): SerializedConversation {
   return {
      ...serializeConversationSummary(conversation),
      messages: conversation.messages.map(serializeConversationMessage),
   };
}
