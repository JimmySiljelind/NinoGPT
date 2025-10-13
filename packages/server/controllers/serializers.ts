import type {
   ConversationMessage,
   ConversationRecord,
} from '../repositories/conversation.repository';
import type { ProjectRecord } from '../repositories/project.repository';

type SerializedConversationMessage = {
   id: string;
   role: ConversationMessage['role'];
   content: string;
   createdAt: string;
};

type SerializedConversationSummary = {
   id: string;
   title: string;
   type: ConversationRecord['type'];
   createdAt: string;
   updatedAt: string;
   messageCount: number;
   projectId: string | null;
   archivedAt: string | null;
};

type SerializedConversation = SerializedConversationSummary & {
   messages: SerializedConversationMessage[];
};

export type SerializedProject = {
   id: string;
   name: string;
   createdAt: string;
   updatedAt: string;
   conversationCount: number;
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
      type: conversation.type,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      messageCount: conversation.messages.length,
      projectId: conversation.projectId,
      archivedAt: conversation.archivedAt
         ? conversation.archivedAt.toISOString()
         : null,
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

export function serializeProject(project: ProjectRecord): SerializedProject {
   return {
      id: project.id,
      name: project.name,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      conversationCount: project.conversationCount,
   };
}
