import { DatabaseSync } from 'node:sqlite';
import * as path from 'path';
import * as fs from 'fs';
import { SCHEMA } from './schema';

let db: DatabaseSync | null = null;

export function initDatabase(dataPath?: string): DatabaseSync {
  if (db) return db;

  const dbPath = dataPath || path.join(process.cwd(), 'data', 'scraper.db');
  const dbDir = path.dirname(dbPath);

  // Ensure directory exists
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  db = new DatabaseSync(dbPath);

  // Enable foreign keys
  db.exec('PRAGMA foreign_keys = ON');

  // Create tables
  db.exec(SCHEMA.PROFILES);
  db.exec(SCHEMA.JOBS);
  db.exec(SCHEMA.JOB_ERRORS);

  console.log('[Database] Initialized at:', dbPath);

  return db;
}

export function getDatabase(): DatabaseSync {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log('[Database] Closed');
  }
}
