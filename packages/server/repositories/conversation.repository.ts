import database from '../database';

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

type ConversationRow = {
   id: string;
   title: string;
   created_at: string;
   updated_at: string;
   last_response_id: string | null;
};

type MessageRow = {
   id: string;
   conversation_id: string;
   role: ConversationRole;
   content: string;
   created_at: string;
};

const selectConversationStmt = database.query<ConversationRow, { $id: string }>(
   `SELECT id, title, created_at, updated_at, last_response_id
    FROM conversations
    WHERE id = $id`
);

const selectConversationsStmt = database.query<
   ConversationRow,
   Record<string, never>
>(
   `SELECT id, title, created_at, updated_at, last_response_id
    FROM conversations
    ORDER BY updated_at DESC`
);

const selectMessagesStmt = database.query<
   MessageRow,
   { $conversationId: string }
>(
   `SELECT id, conversation_id, role, content, created_at
    FROM messages
    WHERE conversation_id = $conversationId
    ORDER BY created_at ASC`
);

const insertConversationStmt = database.query<
   Record<string, never>,
   {
      $id: string;
      $title: string;
      $createdAt: string;
      $updatedAt: string;
      $lastResponseId: string | null;
   }
>(
   `INSERT OR IGNORE INTO conversations (id, title, created_at, updated_at, last_response_id)
    VALUES ($id, $title, $createdAt, $updatedAt, $lastResponseId)`
);

const updateConversationMetaStmt = database.query<
   Record<string, never>,
   {
      $id: string;
      $title: string;
      $updatedAt: string;
   }
>(
   `UPDATE conversations
    SET title = $title,
        updated_at = $updatedAt
    WHERE id = $id`
);

const updateConversationUpdatedAtStmt = database.query<
   Record<string, never>,
   {
      $id: string;
      $updatedAt: string;
   }
>(
   `UPDATE conversations
    SET updated_at = $updatedAt
    WHERE id = $id`
);

const updateLastResponseIdStmt = database.query<
   Record<string, never>,
   {
      $id: string;
      $lastResponseId: string;
      $updatedAt: string;
   }
>(
   `UPDATE conversations
    SET last_response_id = $lastResponseId,
        updated_at = $updatedAt
    WHERE id = $id`
);

const insertMessageStmt = database.query<
   Record<string, never>,
   {
      $id: string;
      $conversationId: string;
      $role: ConversationRole;
      $content: string;
      $createdAt: string;
   }
>(
   `INSERT INTO messages (id, conversation_id, role, content, created_at)
    VALUES ($id, $conversationId, $role, $content, $createdAt)`
);

function rowToConversation(
   row: ConversationRow,
   messages: ConversationMessage[]
): ConversationRecord {
   return {
      id: row.id,
      title: row.title,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      lastResponseId: row.last_response_id,
      messages,
   };
}

function rowToMessage(row: MessageRow): ConversationMessage {
   return {
      id: row.id,
      role: row.role,
      content: row.content,
      createdAt: new Date(row.created_at),
   };
}

function fetchMessages(conversationId: string) {
   const rows = selectMessagesStmt.all({
      $conversationId: conversationId,
   }) as MessageRow[];
   return rows.map(rowToMessage);
}

function fetchConversation(conversationId: string): ConversationRecord | null {
   const row = selectConversationStmt.get({ $id: conversationId }) as
      | ConversationRow
      | undefined
      | null;

   if (!row) {
      return null;
   }

   const messages = fetchMessages(conversationId);
   return rowToConversation(row, messages);
}

function ensure(conversationId: string) {
   const now = new Date().toISOString();

   insertConversationStmt.run({
      $id: conversationId,
      $title: DEFAULT_CONVERSATION_TITLE,
      $createdAt: now,
      $updatedAt: now,
      $lastResponseId: null,
   });
}

export const conversationRepository = {
   ensure(conversationId: string) {
      ensure(conversationId);
      const conversation = fetchConversation(conversationId);

      if (!conversation) {
         throw new Error('Conversation could not be ensured.');
      }

      return conversation;
   },

   get(conversationId: string) {
      return fetchConversation(conversationId);
   },

   list() {
      const rows = selectConversationsStmt.all(
         {} as Record<string, never>
      ) as ConversationRow[];
      return rows.map((row) => rowToConversation(row, fetchMessages(row.id)));
   },

   create(conversationId: string) {
      ensure(conversationId);
      const conversation = fetchConversation(conversationId);

      if (!conversation) {
         throw new Error('Conversation could not be created.');
      }

      return conversation;
   },

   addMessage(conversationId: string, message: ConversationMessage) {
      ensure(conversationId);

      insertMessageStmt.run({
         $id: message.id,
         $conversationId: conversationId,
         $role: message.role,
         $content: message.content,
         $createdAt: message.createdAt.toISOString(),
      });

      updateConversationUpdatedAtStmt.run({
         $id: conversationId,
         $updatedAt: message.createdAt.toISOString(),
      });
   },

   updateTitle(conversationId: string, title: string) {
      ensure(conversationId);

      if (!title.trim()) {
         return fetchConversation(conversationId);
      }

      const updatedAt = new Date().toISOString();

      updateConversationMetaStmt.run({
         $id: conversationId,
         $title: title.trim(),
         $updatedAt: updatedAt,
      });

      const conversation = fetchConversation(conversationId);

      if (!conversation) {
         throw new Error('Conversation not found after updating title.');
      }

      return conversation;
   },

   updateTitleIfDefault(conversationId: string, title: string) {
      ensure(conversationId);

      const current = selectConversationStmt.get({ $id: conversationId }) as
         | ConversationRow
         | undefined
         | null;

      if (!current) {
         throw new Error('Conversation not found when updating title.');
      }

      if (current.title === DEFAULT_CONVERSATION_TITLE && title.trim()) {
         const updatedAt = new Date().toISOString();

         updateConversationMetaStmt.run({
            $id: conversationId,
            $title: title.trim(),
            $updatedAt: updatedAt,
         });
      }

      const conversation = fetchConversation(conversationId);

      if (!conversation) {
         throw new Error('Conversation not found after update.');
      }

      return conversation;
   },

   getMessages(conversationId: string) {
      ensure(conversationId);
      return fetchMessages(conversationId);
   },

   getLastResponseId(conversationId: string) {
      ensure(conversationId);
      const row = selectConversationStmt.get({ $id: conversationId }) as
         | ConversationRow
         | undefined
         | null;
      return row?.last_response_id ?? null;
   },

   setLastResponseId(conversationId: string, responseId: string) {
      ensure(conversationId);
      updateLastResponseIdStmt.run({
         $id: conversationId,
         $lastResponseId: responseId,
         $updatedAt: new Date().toISOString(),
      });
   },
};
