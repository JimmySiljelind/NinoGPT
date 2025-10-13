import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Database } from 'bun:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultDirectory = path.resolve(__dirname, 'data');
const databaseFile =
   process.env.SQLITE_PATH ?? path.join(defaultDirectory, 'chat.db');

if (!databaseFile.startsWith(':memory:')) {
   const directory = path.dirname(databaseFile);

   if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
   } else if (!fs.statSync(directory).isDirectory()) {
      throw new Error(
         `Cannot use SQLite directory at "${directory}" because a file already exists at that path.`
      );
   }
}

const database = new Database(databaseFile, { create: true });

database.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
   id TEXT PRIMARY KEY,
   email TEXT NOT NULL UNIQUE,
   password_hash TEXT NOT NULL,
   name TEXT NOT NULL,
   date_of_birth TEXT NOT NULL,
   phone TEXT NOT NULL,
   created_at TEXT NOT NULL,
   updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email
   ON users (email);

CREATE TABLE IF NOT EXISTS projects (
   id TEXT PRIMARY KEY,
   user_id TEXT NOT NULL,
   name TEXT NOT NULL,
   created_at TEXT NOT NULL,
   updated_at TEXT NOT NULL,
   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS conversations (
   id TEXT PRIMARY KEY,
   user_id TEXT NOT NULL,
   title TEXT NOT NULL,
   type TEXT NOT NULL DEFAULT 'text',
   created_at TEXT NOT NULL,
   updated_at TEXT NOT NULL,
   archived_at TEXT,
   last_response_id TEXT,
   project_id TEXT,
   FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
   id TEXT PRIMARY KEY,
   conversation_id TEXT NOT NULL,
   role TEXT NOT NULL,
   content TEXT NOT NULL,
   created_at TEXT NOT NULL,
   FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at
   ON messages (conversation_id, created_at);
`);

const projectColumns = database
   .query<
      { name: string },
      Record<string, never>
   >(`PRAGMA table_info(projects)`)
   .all({}) as { name: string }[];

const hasProjectUserColumn = projectColumns.some(
   (column) => column.name === 'user_id'
);

if (!hasProjectUserColumn) {
   database.exec(
      `ALTER TABLE projects ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE CASCADE`
   );
}

const conversationColumns = database
   .query<
      { name: string },
      Record<string, never>
   >(`PRAGMA table_info(conversations)`)
   .all({}) as { name: string }[];

const hasConversationUserColumn = conversationColumns.some(
   (column) => column.name === 'user_id'
);

if (!hasConversationUserColumn) {
   database.exec(
      `ALTER TABLE conversations ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE CASCADE`
   );
}

const hasProjectColumn = conversationColumns.some(
   (column) => column.name === 'project_id'
);

const hasConversationTypeColumn = conversationColumns.some(
   (column) => column.name === 'type'
);

if (!hasProjectColumn) {
   database.exec(
      `ALTER TABLE conversations ADD COLUMN project_id TEXT REFERENCES projects(id) ON DELETE CASCADE`
   );
}

const hasArchivedColumn = conversationColumns.some(
   (column) => column.name === 'archived_at'
);

if (!hasArchivedColumn) {
   database.exec(`ALTER TABLE conversations ADD COLUMN archived_at TEXT`);
}

if (!hasConversationTypeColumn) {
   database.exec(
      `ALTER TABLE conversations ADD COLUMN type TEXT NOT NULL DEFAULT 'text'`
   );
}

database.exec(`
CREATE INDEX IF NOT EXISTS idx_projects_user_id
   ON projects (user_id);
`);

database.exec(`
CREATE INDEX IF NOT EXISTS idx_conversations_user_updated_at
   ON conversations (user_id, updated_at);
`);

database.exec(`
CREATE INDEX IF NOT EXISTS idx_conversations_project_updated_at
   ON conversations (project_id, updated_at);
`);

database.exec(`
CREATE INDEX IF NOT EXISTS idx_conversations_user_archived
   ON conversations (user_id, archived_at);
`);

// Ensure archived conversations no longer reference projects so they survive project deletion.
database.exec(`
UPDATE conversations
SET project_id = NULL
WHERE archived_at IS NOT NULL
  AND project_id IS NOT NULL;
`);

export default database;
