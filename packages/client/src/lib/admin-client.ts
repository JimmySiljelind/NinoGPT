import type { ChatConversation, ChatConversationDetail } from '@/types/chat';
import type { AppUser } from '@/types/user';

import {
   makeJsonRequest,
   parseConversationDetail,
   parseConversationSummary,
   type ConversationDetailDto,
} from './chat-client';
import { parseUser, type UserDto } from './auth-client';

export type AdminUser = AppUser & {
   isSelf: boolean;
};

type AdminUserDto = UserDto & {
   isSelf?: boolean;
};

type AdminUsersResponse = {
   users?: AdminUserDto[];
};

type ConversationListResponse = {
   user?: UserDto;
   conversations?: unknown;
   archivedConversations?: unknown;
};

type ConversationDetailResponse = {
   user?: UserDto;
   conversation?: unknown;
};

function parseAdminUser(dto: AdminUserDto): AdminUser {
   const base = parseUser(dto);
   return {
      ...base,
      isSelf: Boolean(dto.isSelf),
   };
}

function normalizeSummaryList(
   value: unknown
): Parameters<typeof parseConversationSummary>[0][] {
   if (!Array.isArray(value)) {
      return [];
   }

   return value.filter(
      (item): item is Parameters<typeof parseConversationSummary>[0] =>
         Boolean(
            item &&
               typeof item === 'object' &&
               'id' in item &&
               typeof item.id === 'string'
         )
   );
}

function isConversationDetailDto(
   value: unknown
): value is ConversationDetailDto {
   if (!value || typeof value !== 'object') {
      return false;
   }

   const record = value as Record<string, unknown>;

   return (
      typeof record.id === 'string' &&
      typeof record.title === 'string' &&
      typeof record.createdAt === 'string' &&
      typeof record.updatedAt === 'string'
   );
}

export async function listAdminUsers(): Promise<AdminUser[]> {
   const data = (await makeJsonRequest('/api/admin/users')) as
      | AdminUsersResponse
      | undefined;

   if (!data || !Array.isArray(data.users)) {
      return [];
   }

   return data.users.map(parseAdminUser);
}

export async function updateAdminUserAccess(
   userId: string,
   isActive: boolean
): Promise<AppUser> {
   const data = await makeJsonRequest(`/api/admin/users/${userId}/access`, {
      method: 'PATCH',
      headers: {
         'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isActive }),
   });

   if (!data || typeof data !== 'object' || !('user' in data)) {
      throw new Error('Failed to update user access.');
   }

   return parseUser((data.user ?? {}) as UserDto);
}

export async function deleteAdminUser(userId: string): Promise<void> {
   await makeJsonRequest(`/api/admin/users/${userId}`, {
      method: 'DELETE',
   });
}

export async function updateAdminUserProfile(
   userId: string,
   payload: { name: string; email: string; phone: string }
): Promise<AppUser> {
   const data = await makeJsonRequest(`/api/admin/users/${userId}/profile`, {
      method: 'PATCH',
      headers: {
         'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
   });

   if (!data || typeof data !== 'object' || !('user' in data)) {
      throw new Error('Failed to update profile.');
   }

   return parseUser((data.user ?? {}) as UserDto);
}

export async function setAdminUserPassword(
   userId: string,
   newPassword: string
): Promise<AppUser> {
   const data = await makeJsonRequest(`/api/admin/users/${userId}/password`, {
      method: 'PATCH',
      headers: {
         'Content-Type': 'application/json',
      },
      body: JSON.stringify({ newPassword }),
   });

   if (!data || typeof data !== 'object' || !('user' in data)) {
      throw new Error('Failed to update password.');
   }

   return parseUser((data.user ?? {}) as UserDto);
}

export async function fetchUserConversations(userId: string): Promise<{
   user: AppUser;
   conversations: ChatConversation[];
   archivedConversations: ChatConversation[];
}> {
   const data = (await makeJsonRequest(
      `/api/admin/users/${userId}/conversations`
   )) as ConversationListResponse | undefined;

   if (!data || !data.user) {
      throw new Error('Failed to load user conversations.');
   }

   const conversations = normalizeSummaryList(data.conversations ?? []).map(
      parseConversationSummary
   );
   const archived = normalizeSummaryList(data.archivedConversations ?? []).map(
      parseConversationSummary
   );

   return {
      user: parseUser(data.user),
      conversations,
      archivedConversations: archived,
   };
}

export async function fetchUserConversationDetail(
   userId: string,
   conversationId: string
): Promise<{
   user: AppUser;
   conversation: ChatConversationDetail;
}> {
   const data = (await makeJsonRequest(
      `/api/admin/users/${userId}/conversations/${conversationId}`
   )) as ConversationDetailResponse | undefined;

   if (!data || !data.user || !data.conversation) {
      throw new Error('Failed to load conversation.');
   }

   if (!isConversationDetailDto(data.conversation)) {
      throw new Error('Failed to load conversation.');
   }

   return {
      user: parseUser(data.user),
      conversation: parseConversationDetail(data.conversation),
   };
}

export async function deleteAdminUserConversation(
   userId: string,
   conversationId: string
): Promise<void> {
   await makeJsonRequest(
      `/api/admin/users/${userId}/conversations/${conversationId}`,
      {
         method: 'DELETE',
      }
   );
}
