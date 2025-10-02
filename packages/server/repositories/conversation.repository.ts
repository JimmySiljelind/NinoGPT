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
   userId: string;
   title: string;
   createdAt: Date;
   updatedAt: Date;
   lastResponseId: string | null;
   projectId: string | null;
   messages: ConversationMessage[];
};

export const DEFAULT_CONVERSATION_TITLE = 'New chat';

type ConversationRow = {
   id: string;
   user_id: string;
   title: string;
   created_at: string;
   updated_at: string;
   last_response_id: string | null;
   project_id: string | null;
};

type MessageRow = {
   id: string;
   conversation_id: string;
   role: ConversationRole;
   content: string;
   created_at: string;
};

const selectConversationStmt = database.query<
   ConversationRow,
   { $id: string; $userId: string }
>(
   `SELECT id,
           user_id,
           title,
           created_at,
           updated_at,
           last_response_id,
           project_id
    FROM conversations
    WHERE id = $id AND user_id = $userId`
);

const selectConversationsStmt = database.query<
   ConversationRow,
   { $userId: string }
>(
   `SELECT id,
           user_id,
           title,
           created_at,
           updated_at,
           last_response_id,
           project_id
    FROM conversations
    WHERE user_id = $userId
    ORDER BY updated_at DESC`
);

const selectMessagesStmt = database.query<
   MessageRow,
   { $conversationId: string }
>(
   `SELECT id,
           conversation_id,
           role,
           content,
           created_at
    FROM messages
    WHERE conversation_id = $conversationId
    ORDER BY created_at ASC`
);

const insertConversationStmt = database.query<
   Record<string, never>,
   {
      $id: string;
      $userId: string;
      $title: string;
      $createdAt: string;
      $updatedAt: string;
      $lastResponseId: string | null;
      $projectId: string | null;
   }
>(
   `INSERT OR IGNORE INTO conversations (id, user_id, title, created_at, updated_at, last_response_id, project_id)
    VALUES ($id, $userId, $title, $createdAt, $updatedAt, $lastResponseId, $projectId)`
);

const updateConversationMetaStmt = database.query<
   Record<string, never>,
   {
      $id: string;
      $userId: string;
      $title: string;
      $updatedAt: string;
   }
>(
   `UPDATE conversations
    SET title = $title,
        updated_at = $updatedAt
    WHERE id = $id AND user_id = $userId`
);

const updateConversationProjectStmt = database.query<
   Record<string, never>,
   {
      $id: string;
      $userId: string;
      $projectId: string | null;
      $updatedAt: string;
   }
>(
   `UPDATE conversations
    SET project_id = $projectId,
        updated_at = $updatedAt
    WHERE id = $id AND user_id = $userId`
);

const updateConversationUpdatedAtStmt = database.query<
   Record<string, never>,
   {
      $id: string;
      $userId: string;
      $updatedAt: string;
   }
>(
   `UPDATE conversations
    SET updated_at = $updatedAt
    WHERE id = $id AND user_id = $userId`
);

const updateLastResponseIdStmt = database.query<
   Record<string, never>,
   {
      $id: string;
      $userId: string;
      $lastResponseId: string;
      $updatedAt: string;
   }
>(
   `UPDATE conversations
    SET last_response_id = $lastResponseId,
        updated_at = $updatedAt
    WHERE id = $id AND user_id = $userId`
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

const deleteConversationStmt = database.query<
   Record<string, never>,
   { $id: string; $userId: string }
>(
   `DELETE FROM conversations
    WHERE id = $id AND user_id = $userId`
);

const selectProjectStmt = database.query<
   { id: string },
   { $id: string; $userId: string }
>(
   `SELECT id
    FROM projects
    WHERE id = $id AND user_id = $userId`
);

function rowToConversation(
   row: ConversationRow,
   messages: ConversationMessage[]
): ConversationRecord {
   return {
      id: row.id,
      userId: row.user_id,
      title: row.title,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      lastResponseId: row.last_response_id,
      projectId: row.project_id ?? null,
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

function fetchConversation(
   userId: string,
   conversationId: string
): ConversationRecord | null {
   const row = selectConversationStmt.get({
      $id: conversationId,
      $userId: userId,
   }) as ConversationRow | undefined | null;

   if (!row) {
      return null;
   }

   const messages = fetchMessages(conversationId);
   return rowToConversation(row, messages);
}

function createConversationIfMissing(
   conversationId: string,
   userId: string,
   projectId: string | null = null
) {
   const now = new Date().toISOString();

   insertConversationStmt.run({
      $id: conversationId,
      $userId: userId,
      $title: DEFAULT_CONVERSATION_TITLE,
      $createdAt: now,
      $updatedAt: now,
      $lastResponseId: null,
      $projectId: projectId,
   });
}

export const conversationRepository = {
   list(userId: string) {
      const rows = selectConversationsStmt.all({
         $userId: userId,
      }) as ConversationRow[];

      return rows.map((row) => rowToConversation(row, fetchMessages(row.id)));
   },

   create(userId: string, conversationId: string, projectId: string | null) {
      createConversationIfMissing(conversationId, userId, projectId);

      const conversation = fetchConversation(userId, conversationId);

      if (!conversation) {
         throw new Error('Conversation could not be created.');
      }

      return conversation;
   },

   get(userId: string, conversationId: string) {
      return fetchConversation(userId, conversationId);
   },

   ensure(
      userId: string,
      conversationId: string,
      projectId: string | null = null
   ) {
      createConversationIfMissing(conversationId, userId, projectId);

      const conversation = fetchConversation(userId, conversationId);

      if (!conversation) {
         throw new Error('Conversation could not be ensured.');
      }

      return conversation;
   },

   addMessage(
      userId: string,
      conversationId: string,
      message: ConversationMessage
   ) {
      const conversation = selectConversationStmt.get({
         $id: conversationId,
         $userId: userId,
      }) as ConversationRow | undefined | null;

      if (!conversation) {
         throw new Error('Conversation not found when adding message.');
      }

      insertMessageStmt.run({
         $id: message.id,
         $conversationId: conversationId,
         $role: message.role,
         $content: message.content,
         $createdAt: message.createdAt.toISOString(),
      });

      updateConversationUpdatedAtStmt.run({
         $id: conversationId,
         $userId: userId,
         $updatedAt: message.createdAt.toISOString(),
      });
   },

   updateTitle(userId: string, conversationId: string, title: string) {
      if (!title.trim()) {
         return fetchConversation(userId, conversationId);
      }

      const updatedAt = new Date().toISOString();

      updateConversationMetaStmt.run({
         $id: conversationId,
         $userId: userId,
         $title: title.trim(),
         $updatedAt: updatedAt,
      });

      const conversation = fetchConversation(userId, conversationId);

      if (!conversation) {
         throw new Error('Conversation not found after updating title.');
      }

      return conversation;
   },

   updateTitleIfDefault(userId: string, conversationId: string, title: string) {
      const current = selectConversationStmt.get({
         $id: conversationId,
         $userId: userId,
      }) as ConversationRow | undefined | null;

      if (!current) {
         throw new Error('Conversation not found when updating title.');
      }

      if (current.title === DEFAULT_CONVERSATION_TITLE && title.trim()) {
         const updatedAt = new Date().toISOString();

         updateConversationMetaStmt.run({
            $id: conversationId,
            $userId: userId,
            $title: title.trim(),
            $updatedAt: updatedAt,
         });
      }

      const conversation = fetchConversation(userId, conversationId);

      if (!conversation) {
         throw new Error('Conversation not found after update.');
      }

      return conversation;
   },

   getMessages(userId: string, conversationId: string) {
      const conversation = fetchConversation(userId, conversationId);

      if (!conversation) {
         throw new Error('Conversation not found when fetching messages.');
      }

      return conversation.messages;
   },

   getLastResponseId(userId: string, conversationId: string) {
      const row = selectConversationStmt.get({
         $id: conversationId,
         $userId: userId,
      }) as ConversationRow | undefined | null;
      return row?.last_response_id ?? null;
   },

   setLastResponseId(
      userId: string,
      conversationId: string,
      responseId: string
   ) {
      updateLastResponseIdStmt.run({
         $id: conversationId,
         $userId: userId,
         $lastResponseId: responseId,
         $updatedAt: new Date().toISOString(),
      });
   },

   delete(userId: string, conversationId: string) {
      const existing = selectConversationStmt.get({
         $id: conversationId,
         $userId: userId,
      }) as ConversationRow | undefined | null;

      if (!existing) {
         return false;
      }

      deleteConversationStmt.run({ $id: conversationId, $userId: userId });
      return true;
   },

   setProject(
      userId: string,
      conversationId: string,
      projectId: string | null
   ) {
      const existing = selectConversationStmt.get({
         $id: conversationId,
         $userId: userId,
      }) as ConversationRow | undefined | null;

      if (!existing) {
         return null;
      }

      if (projectId) {
         const project = selectProjectStmt.get({
            $id: projectId,
            $userId: userId,
         }) as { id: string } | undefined | null;

         if (!project) {
            throw new Error('Project not found when assigning conversation.');
         }
      }

      updateConversationProjectStmt.run({
         $id: conversationId,
         $userId: userId,
         $projectId: projectId ?? null,
         $updatedAt: new Date().toISOString(),
      });

      return fetchConversation(userId, conversationId);
   },
};
