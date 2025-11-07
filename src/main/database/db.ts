import { DatabaseSync } from 'node:sqlite';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';
import { SCHEMA } from './schema';

let db: DatabaseSync | null = null;

/**
 * Run database migrations to update schema
 */
function runMigrations(db: DatabaseSync): void {
  // Get current columns in profiles table
  const columns = db.prepare('PRAGMA table_info(profiles)').all() as Array<{ name: string }>;
  const columnNames = new Set(columns.map(col => col.name));

  // Migration 1: Add prepend_domain column
  if (!columnNames.has('prepend_domain')) {
    console.log('[Database] Running migration: Adding prepend_domain column to profiles table');
    db.exec('ALTER TABLE profiles ADD COLUMN prepend_domain INTEGER DEFAULT 0');
    console.log('[Database] Migration complete: prepend_domain column added');
  }

  // Migration 2: Add headless column
  if (!columnNames.has('headless')) {
    console.log('[Database] Running migration: Adding headless column to profiles table');
    db.exec('ALTER TABLE profiles ADD COLUMN headless INTEGER DEFAULT 1');
    console.log('[Database] Migration complete: headless column added');
  }

  // Migration 3: Add overwrite_existing column
  if (!columnNames.has('overwrite_existing')) {
    console.log('[Database] Running migration: Adding overwrite_existing column to profiles table');
    db.exec('ALTER TABLE profiles ADD COLUMN overwrite_existing INTEGER DEFAULT 0');
    console.log('[Database] Migration complete: overwrite_existing column added');
  }

  // Migration 4: Add phase column to jobs table
  const jobColumns = db.prepare('PRAGMA table_info(jobs)').all() as Array<{ name: string }>;
  const jobColumnNames = new Set(jobColumns.map(col => col.name));

  if (!jobColumnNames.has('phase')) {
    console.log('[Database] Running migration: Adding phase column to jobs table');
    db.exec('ALTER TABLE jobs ADD COLUMN phase TEXT');
    console.log('[Database] Migration complete: phase column added');
  }

  // Migration 5: Add profile sharing metadata fields
  if (!columnNames.has('is_public')) {
    console.log('[Database] Running migration: Adding profile sharing metadata fields');
    db.exec(`
      ALTER TABLE profiles ADD COLUMN is_public INTEGER DEFAULT 0;
      ALTER TABLE profiles ADD COLUMN is_readonly INTEGER DEFAULT 0;
      ALTER TABLE profiles ADD COLUMN source_profile_id TEXT DEFAULT NULL;
      ALTER TABLE profiles ADD COLUMN source_url TEXT DEFAULT NULL;
      ALTER TABLE profiles ADD COLUMN author TEXT DEFAULT NULL;
      ALTER TABLE profiles ADD COLUMN description TEXT DEFAULT NULL;
      ALTER TABLE profiles ADD COLUMN tags TEXT DEFAULT NULL;
      ALTER TABLE profiles ADD COLUMN version TEXT DEFAULT NULL;
      ALTER TABLE profiles ADD COLUMN last_synced INTEGER DEFAULT NULL;
    `);
    console.log('[Database] Migration complete: profile sharing metadata fields added');
  }
}

export function initDatabase(dataPath?: string): DatabaseSync {
  if (db) return db;

  // Use app.getPath('userData') for production, process.cwd() for development
  const defaultPath = app.isPackaged
    ? path.join(app.getPath('userData'), 'data', 'scraper.db')
    : path.join(process.cwd(), 'data', 'scraper.db');

  const dbPath = dataPath || defaultPath;
  const dbDir = path.dirname(dbPath);

  console.log('[Database] Initializing database at:', dbPath);

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
  db.exec(SCHEMA.PRODUCTS);
  db.exec(SCHEMA.SCRAPE_DATA);
  db.exec(SCHEMA.PRODUCT_LOGS);

  // Create indexes for performance
  db.exec('CREATE INDEX IF NOT EXISTS idx_products_job_id ON products(job_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_products_url ON products(url)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_scrape_data_product_id ON scrape_data(product_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_scrape_data_field_name ON scrape_data(field_name)');
  db.exec(SCHEMA.PRODUCT_LOGS_INDEX);

  // Run migrations
  runMigrations(db);

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
