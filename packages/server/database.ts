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

CREATE TABLE IF NOT EXISTS conversations (
   id TEXT PRIMARY KEY,
   title TEXT NOT NULL,
   created_at TEXT NOT NULL,
   updated_at TEXT NOT NULL,
   last_response_id TEXT
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

export default database;
