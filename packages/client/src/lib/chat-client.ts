import type {
   ChatConversation,
   ChatConversationDetail,
   ChatMessage,
   ChatRole,
} from '@/types/chat';

type ChatErrorOptions = {
   conversation?: ChatConversationDetail;
   status?: number;
};

export class ChatRequestError extends Error {
   conversation?: ChatConversationDetail;
   status?: number;

   constructor(message: string, options: ChatErrorOptions = {}) {
      super(message);
      this.name = 'ChatRequestError';
      this.conversation = options.conversation;
      this.status = options.status;
   }
}

type ConversationSummaryDto = {
   id: string;
   title: string;
   createdAt: string;
   updatedAt: string;
   messageCount?: number;
   projectId?: string | null;
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
      projectId: dto.projectId ?? null,
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

export async function makeJsonRequest(
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
         credentials: init?.credentials ?? 'include',
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

         if (response.status === 401 && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth:unauthorized'));
         }

         throw new ChatRequestError(message, {
            conversation,
            status: response.status,
         });
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

export async function createConversation(
   projectId?: string | null
): Promise<ChatConversation> {
   const hasProject = typeof projectId !== 'undefined';
   const body = hasProject ? JSON.stringify({ projectId }) : undefined;

   const data = await makeJsonRequest('/api/conversations', {
      method: 'POST',
      headers: hasProject
         ? {
              'Content-Type': 'application/json',
           }
         : undefined,
      body,
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

type UpdateConversationPayload = {
   projectId?: string | null;
   title?: string;
};

export async function updateConversation(
   conversationId: string,
   payload: UpdateConversationPayload
): Promise<ChatConversation> {
   if (!conversationId) {
      throw new ChatRequestError('Conversation id is required.');
   }

   const hasPayload = payload && Object.keys(payload).length > 0;

   if (!hasPayload) {
      throw new ChatRequestError('No updates provided.');
   }

   const data = await makeJsonRequest(`/api/conversations/${conversationId}`, {
      method: 'PATCH',
      headers: {
         'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
   });

   if (!data || !data.conversation) {
      throw new ChatRequestError('Failed to update conversation.');
   }

   return parseConversationSummary(data.conversation as ConversationSummaryDto);
}
