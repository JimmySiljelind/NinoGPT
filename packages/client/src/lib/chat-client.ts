import type {
   ChatConversation,
   ChatConversationDetail,
   ChatMessage,
   ChatRole,
} from '@/types/chat';

export class ChatRequestError extends Error {
   conversation?: ChatConversationDetail;

   constructor(message: string, conversation?: ChatConversationDetail) {
      super(message);
      this.name = 'ChatRequestError';
      this.conversation = conversation;
   }
}

type ConversationSummaryDto = {
   id: string;
   title: string;
   createdAt: string;
   updatedAt: string;
   messageCount?: number;
};

type ConversationDetailDto = ConversationSummaryDto & {
   messages?: MessageDto[];
};

type MessageDto = {
   id: string;
   role: ChatRole;
   content: string;
   createdAt: string;
};

type JsonValue = Record<string, unknown> | undefined;

function parseMessage(dto: MessageDto): ChatMessage {
   return {
      id: dto.id,
      role: dto.role,
      content: dto.content,
      createdAt: new Date(dto.createdAt),
   };
}

function parseConversationSummary(
   dto: ConversationSummaryDto
): ChatConversation {
   return {
      id: dto.id,
      title: dto.title,
      createdAt: new Date(dto.createdAt),
      updatedAt: new Date(dto.updatedAt),
      messageCount: dto.messageCount ?? 0,
   };
}

function parseConversationDetail(
   dto: ConversationDetailDto
): ChatConversationDetail {
   const messagesDto = Array.isArray(dto.messages) ? dto.messages : [];
   const messages = messagesDto.map(parseMessage);

   return {
      ...parseConversationSummary(dto),
      messageCount: dto.messageCount ?? messages.length,
      messages,
   };
}

async function makeJsonRequest(
   input: RequestInfo,
   init?: RequestInit
): Promise<JsonValue> {
   try {
      const headers = new Headers(init?.headers as HeadersInit | undefined);
      if (!headers.has('Accept')) {
         headers.set('Accept', 'application/json');
      }

      const response = await fetch(input, {
         ...init,
         headers,
      });

      const text = await response.text();
      const data = text ? (JSON.parse(text) as JsonValue) : undefined;

      if (!response.ok) {
         const conversation =
            data && typeof data === 'object' && 'conversation' in data
               ? parseConversationDetail(
                    data.conversation as ConversationDetailDto
                 )
               : undefined;

         const message =
            data && typeof data?.error === 'string'
               ? (data.error as string)
               : 'Request failed.';

         throw new ChatRequestError(message, conversation);
      }

      return data;
   } catch (error) {
      if (error instanceof ChatRequestError) {
         throw error;
      }

      const message =
         error instanceof Error ? error.message : 'Network request failed.';
      throw new ChatRequestError(message);
   }
}

export async function listConversations(): Promise<ChatConversation[]> {
   const data = await makeJsonRequest('/api/conversations');

   if (!data || !Array.isArray(data.conversations)) {
      return [];
   }

   return (data.conversations as ConversationSummaryDto[]).map(
      parseConversationSummary
   );
}

export async function createConversation(): Promise<ChatConversation> {
   const data = await makeJsonRequest('/api/conversations', {
      method: 'POST',
   });

   if (!data || !data.conversation) {
      throw new ChatRequestError('Failed to create conversation.');
   }

   return parseConversationSummary(data.conversation as ConversationSummaryDto);
}

export async function getConversation(
   conversationId: string
): Promise<ChatConversationDetail> {
   const data = await makeJsonRequest(`/api/conversations/${conversationId}`);

   if (!data || !data.conversation) {
      throw new ChatRequestError('Conversation not found.');
   }

   return parseConversationDetail(data.conversation as ConversationDetailDto);
}

type SendChatPayload = {
   prompt: string;
   conversationId: string;
};

export async function sendChatMessage(
   payload: SendChatPayload
): Promise<ChatConversationDetail> {
   const data = await makeJsonRequest('/api/chat', {
      method: 'POST',
      headers: {
         'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
   });

   if (!data || !data.conversation) {
      throw new ChatRequestError('Failed to send message.');
   }

   return parseConversationDetail(data.conversation as ConversationDetailDto);
}

export async function deleteConversation(
   conversationId: string
): Promise<void> {
   if (!conversationId) {
      throw new ChatRequestError('Conversation id is required.');
   }

   await makeJsonRequest(`/api/conversations/${conversationId}`, {
      method: 'DELETE',
   });
}
