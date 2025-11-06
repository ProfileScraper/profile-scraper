import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'crypto';
import { ProductRepository } from './ProductRepository';

export type JobPhase =
  | 'initializing'
  | 'gathering_urls'
  | 'crawling_products'
  | 'finalizing'
  | null;

export interface JobRow {
  id: string;
  profile_id: string;
  started_at: number;
  completed_at: number | null;
  status: string;
  phase: string | null;
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
  phase: JobPhase;
  totalProducts: number | null;
  productsScraped: number | null;
  successCount: number | null;
  failCount: number | null;
  outputDir: string | null;
  checkpointPath: string | null;
  errorMessage: string | null;
}

export class JobRepository {
  private productRepo: ProductRepository;

  constructor(private db: DatabaseSync) {
    this.productRepo = new ProductRepository(db);
  }

  create(data: { profileId: string; totalProducts?: number; outputDir?: string; checkpointPath?: string }): string {
    const id = randomUUID();
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO jobs (
        id, profile_id, started_at, status, phase, total_products, output_dir, checkpoint_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.profileId,
      now,
      'running',
      'initializing',
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

  updatePaths(id: string, outputDir: string, checkpointPath: string): void {
    const stmt = this.db.prepare(`
      UPDATE jobs SET
        output_dir = ?,
        checkpoint_path = ?
      WHERE id = ?
    `);

    const result = stmt.run(outputDir, checkpointPath, id);

    if (result.changes === 0) {
      throw new Error(`Job not found: ${id}`);
    }
  }

  updatePhase(id: string, phase: JobPhase): void {
    const stmt = this.db.prepare(`
      UPDATE jobs SET phase = ? WHERE id = ?
    `);

    const result = stmt.run(phase, id);

    if (result.changes === 0) {
      throw new Error(`Job not found: ${id}`);
    }
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

  delete(id: string): void {
    // Foreign key constraints will cascade delete products, job_errors, etc.
    const stmt = this.db.prepare('DELETE FROM jobs WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes === 0) {
      throw new Error(`Job not found: ${id}`);
    }
  }

  deleteEmptyJobs(): number {
    // Delete jobs that have no products in the database
    const stmt = this.db.prepare(`
      DELETE FROM jobs
      WHERE id NOT IN (SELECT DISTINCT job_id FROM products)
    `);
    const result = stmt.run();
    return Number(result.changes || 0);
  }

  private rowToJob(row: JobRow): Job {
    const validStatuses: Job['status'][] = ['running', 'completed', 'stopped', 'failed'];

    if (!validStatuses.includes(row.status as Job['status'])) {
      throw new Error(`Invalid job status: ${row.status}`);
    }

    const validPhases: JobPhase[] = ['initializing', 'gathering_urls', 'crawling_products', 'finalizing', null];
    const phase = row.phase && validPhases.includes(row.phase as JobPhase) ? (row.phase as JobPhase) : null;

    // Get actual product count from database instead of using cached value
    const actualProductCount = this.productRepo.countByJobId(row.id);

    return {
      id: row.id,
      profileId: row.profile_id,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      status: row.status as Job['status'],
      phase,
      totalProducts: row.total_products,
      productsScraped: actualProductCount, // Use actual count from products table
      successCount: row.success_count,
      failCount: row.fail_count,
      outputDir: row.output_dir,
      checkpointPath: row.checkpoint_path,
      errorMessage: row.error_message
    };
  }
}
