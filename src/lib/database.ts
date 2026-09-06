import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'gemini-free.db');

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    
    // Create tables first (no indexes that depend on the 'mode' column yet, so
    // legacy databases missing that column don't crash the whole script).
    db.exec(`
      CREATE TABLE IF NOT EXISTS threads (
        id TEXT PRIMARY KEY,
        title TEXT,
        mode TEXT NOT NULL DEFAULT 'chat',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        reasoning TEXT,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);
    `);

    // Migration: ensure legacy 'threads' tables that were created before the
    // 'mode' column existed get it added, otherwise inserts would fail and no
    // chat history would ever be saved.
    migrateAddColumn(db, 'threads', 'mode', "TEXT NOT NULL DEFAULT 'chat'");
    migrateAddColumn(db, 'threads', 'created_at', "TEXT NOT NULL DEFAULT (datetime('now'))");
    migrateAddColumn(db, 'threads', 'updated_at', "TEXT NOT NULL DEFAULT (datetime('now'))");

    // Migration: ensure legacy 'messages' tables have the 'reasoning' column.
    migrateAddColumn(db, 'messages', 'reasoning', 'TEXT');

    // Now that the 'mode' column is guaranteed, create the remaining indexes.
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_threads_updated_at ON threads(updated_at DESC);
      CREATE INDEX IF NOT EXISTS idx_threads_mode ON threads(mode);
    `);
  }
  return db;
}

function migrateAddColumn(db: Database.Database, table: string, column: string, definition: string): void {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some(c => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

export type Mode = 'chat' | 'learn' | 'explore' | 'draw';

export interface Thread {
  id: string;
  title: string | null;
  mode: Mode;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  thread_id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning: string | null;
  timestamp: string;
}

export function createThread(id: string, mode: Mode, title?: string): Thread {
  const db = getDb();
  // normalize legacy explore -> learn
  const normMode = (mode === 'explore' ? 'learn' : mode) as Mode;
  const stmt = db.prepare(`
    INSERT INTO threads (id, title, mode) VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET title = COALESCE(excluded.title, title), mode = excluded.mode, updated_at = datetime('now')
  `);
  stmt.run(id, title || null, normMode);
  const row = db.prepare('SELECT * FROM threads WHERE id = ?').get(id) as Thread;
  return row;
}

export function getThread(id: string): Thread | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM threads WHERE id = ?').get(id) as Thread | undefined;
}

export function getThreadsByMode(mode: Mode): Thread[] {
  const db = getDb();
  const m = (mode === 'explore' ? 'learn' : mode) as Mode;
  // include legacy explore rows when querying learn
  if (m === 'learn') {
    return db.prepare("SELECT * FROM threads WHERE mode IN ('learn','explore') ORDER BY updated_at DESC").all() as Thread[];
  }
  return db.prepare('SELECT * FROM threads WHERE mode = ? ORDER BY updated_at DESC').all(m) as Thread[];
}

export function getAllThreads(): Thread[] {
  const db = getDb();
  return db.prepare('SELECT * FROM threads ORDER BY updated_at DESC').all() as Thread[];
}

export function updateThreadTitle(id: string, title: string): void {
  const db = getDb();
  db.prepare('UPDATE threads SET title = ?, updated_at = datetime(\'now\') WHERE id = ?').run(title, id);
}

export function deleteThread(id: string): void {
  const db = getDb();
  db.prepare('DELETE FROM threads WHERE id = ?').run(id);
}

export function addMessage(msg: Omit<Message, 'id'> & { id?: string }): Message {
  const db = getDb();
  const id = msg.id || `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const stmt = db.prepare(`
    INSERT INTO messages (id, thread_id, role, content, reasoning, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      thread_id = excluded.thread_id,
      role = excluded.role,
      content = excluded.content,
      reasoning = excluded.reasoning,
      timestamp = excluded.timestamp
  `);
  stmt.run(id, msg.thread_id, msg.role, msg.content, msg.reasoning || null, msg.timestamp);
  db.prepare('UPDATE threads SET updated_at = datetime(\'now\') WHERE id = ?').run(msg.thread_id);
  return { ...msg, id } as Message;
}

export function getMessagesByThread(threadId: string): Message[] {
  const db = getDb();
  return db.prepare('SELECT * FROM messages WHERE thread_id = ? ORDER BY timestamp ASC').all(threadId) as Message[];
}

export function clearThreadMessages(threadId: string): void {
  const db = getDb();
  db.prepare('DELETE FROM messages WHERE thread_id = ?').run(threadId);
  db.prepare('UPDATE threads SET updated_at = datetime(\'now\') WHERE id = ?').run(threadId);
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
