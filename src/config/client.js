import Database from 'better-sqlite3';

const db = new Database('task_retry_engine.db');

db.pragma('journal_mode = WAL');

export default db;