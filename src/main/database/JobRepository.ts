import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'crypto';

export interface JobRow {
  id: string;
  profile_id: string;
  started_at: number;
  completed_at: number | null;
  status: string;
  total_products: number | null;
  products_scraped: number | null;
  success_count: number | null;
  fail_count: number | null;
  output_dir: string | null;
  checkpoint_path: string | null;
  error_message: string | null;
}

export interface Job {
  id: string;
  profileId: string;
  startedAt: number;
  completedAt: number | null;
  status: 'running' | 'completed' | 'stopped' | 'failed';
  totalProducts: number | null;
  productsScraped: number | null;
  successCount: number | null;
  failCount: number | null;
  outputDir: string | null;
  checkpointPath: string | null;
  errorMessage: string | null;
}

export class JobRepository {
  constructor(private db: DatabaseSync) {}

  create(data: { profileId: string; totalProducts?: number; outputDir?: string; checkpointPath?: string }): string {
    const id = randomUUID();
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO jobs (
        id, profile_id, started_at, status, total_products, output_dir, checkpoint_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.profileId,
      now,
      'running',
      data.totalProducts || null,
      data.outputDir || null,
      data.checkpointPath || null
    );

    return id;
  }

  getById(id: string): Job | null {
    const stmt = this.db.prepare('SELECT * FROM jobs WHERE id = ?');
    const row = stmt.get(id) as JobRow | undefined;

    if (!row) return null;

    return this.rowToJob(row);
  }

  updateProgress(id: string, progress: { productsScraped: number; successCount: number; failCount: number }): void {
    const stmt = this.db.prepare(`
      UPDATE jobs SET
        products_scraped = ?,
        success_count = ?,
        fail_count = ?
      WHERE id = ?
    `);

    const result = stmt.run(progress.productsScraped, progress.successCount, progress.failCount, id);

    if (result.changes === 0) {
      throw new Error(`Job not found: ${id}`);
    }
  }

  complete(id: string, finalStats: { productsScraped: number; successCount: number; failCount: number }): void {
    const now = Date.now();

    const stmt = this.db.prepare(`
      UPDATE jobs SET
        completed_at = ?,
        status = ?,
        products_scraped = ?,
        success_count = ?,
        fail_count = ?
      WHERE id = ?
    `);

    const result = stmt.run(now, 'completed', finalStats.productsScraped, finalStats.successCount, finalStats.failCount, id);

    if (result.changes === 0) {
      throw new Error(`Job not found: ${id}`);
    }
  }

  fail(id: string, errorMessage: string): void {
    const now = Date.now();

    const stmt = this.db.prepare(`
      UPDATE jobs SET
        completed_at = ?,
        status = ?,
        error_message = ?
      WHERE id = ?
    `);

    const result = stmt.run(now, 'failed', errorMessage, id);

    if (result.changes === 0) {
      throw new Error(`Job not found: ${id}`);
    }
  }

  stop(id: string): void {
    const now = Date.now();

    const stmt = this.db.prepare(`
      UPDATE jobs SET
        completed_at = ?,
        status = ?
      WHERE id = ?
    `);

    const result = stmt.run(now, 'stopped', id);

    if (result.changes === 0) {
      throw new Error(`Job not found: ${id}`);
    }
  }

  getAll(): Job[] {
    const stmt = this.db.prepare('SELECT * FROM jobs ORDER BY started_at DESC');
    const rows = stmt.all() as unknown as JobRow[];
    return rows.map(row => this.rowToJob(row));
  }

  getByProfileId(profileId: string): Job[] {
    const stmt = this.db.prepare('SELECT * FROM jobs WHERE profile_id = ? ORDER BY started_at DESC');
    const rows = stmt.all(profileId) as unknown as JobRow[];
    return rows.map(row => this.rowToJob(row));
  }

  private rowToJob(row: JobRow): Job {
    const validStatuses: Job['status'][] = ['running', 'completed', 'stopped', 'failed'];

    if (!validStatuses.includes(row.status as Job['status'])) {
      throw new Error(`Invalid job status: ${row.status}`);
    }

    return {
      id: row.id,
      profileId: row.profile_id,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      status: row.status as Job['status'],
      totalProducts: row.total_products,
      productsScraped: row.products_scraped,
      successCount: row.success_count,
      failCount: row.fail_count,
      outputDir: row.output_dir,
      checkpointPath: row.checkpoint_path,
      errorMessage: row.error_message
    };
  }
}
