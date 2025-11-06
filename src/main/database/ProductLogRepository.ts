import { DatabaseSync } from 'node:sqlite';

export type LogLevel = 'info' | 'warning' | 'error' | 'debug';

export interface ProductLog {
  id: number;
  productId: number;
  timestamp: number;
  logLevel: LogLevel;
  message: string;
  context?: Record<string, any>;
  fieldName?: string;
  selector?: string;
  elementCount?: number;
  errorMessage?: string;
}

export interface ProductLogCreate {
  productId: number;
  logLevel: LogLevel;
  message: string;
  context?: Record<string, any>;
  fieldName?: string;
  selector?: string;
  elementCount?: number;
  errorMessage?: string;
}

export class ProductLogRepository {
  constructor(private db: DatabaseSync) {}

  /**
   * Create a new product log entry
   */
  create(log: ProductLogCreate): number {
    const stmt = this.db.prepare(`
      INSERT INTO product_logs (
        product_id, timestamp, log_level, message, context,
        field_name, selector, element_count, error_message
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const contextJson = log.context ? JSON.stringify(log.context) : null;
    const result = stmt.run(
      log.productId,
      Date.now(),
      log.logLevel,
      log.message,
      contextJson,
      log.fieldName || null,
      log.selector || null,
      log.elementCount !== undefined ? log.elementCount : null,
      log.errorMessage || null
    );

    return result.lastInsertRowid as number;
  }

  /**
   * Create multiple log entries in a batch (more efficient)
   */
  createBatch(logs: ProductLogCreate[]): void {
    if (logs.length === 0) return;

    const stmt = this.db.prepare(`
      INSERT INTO product_logs (
        product_id, timestamp, log_level, message, context,
        field_name, selector, element_count, error_message
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Execute all inserts
    for (const log of logs) {
      const contextJson = log.context ? JSON.stringify(log.context) : null;
      stmt.run(
        log.productId,
        Date.now(),
        log.logLevel,
        log.message,
        contextJson,
        log.fieldName || null,
        log.selector || null,
        log.elementCount !== undefined ? log.elementCount : null,
        log.errorMessage || null
      );
    }
  }

  /**
   * Get all logs for a specific product
   */
  getByProductId(productId: number): ProductLog[] {
    const stmt = this.db.prepare(`
      SELECT * FROM product_logs
      WHERE product_id = ?
      ORDER BY timestamp ASC
    `);

    const rows = stmt.all(productId) as Array<{
      id: number;
      product_id: number;
      timestamp: number;
      log_level: string;
      message: string;
      context: string | null;
      field_name: string | null;
      selector: string | null;
      element_count: number | null;
      error_message: string | null;
    }>;

    return rows.map(row => ({
      id: row.id,
      productId: row.product_id,
      timestamp: row.timestamp,
      logLevel: row.log_level as LogLevel,
      message: row.message,
      context: row.context ? JSON.parse(row.context) : undefined,
      fieldName: row.field_name || undefined,
      selector: row.selector || undefined,
      elementCount: row.element_count !== null ? row.element_count : undefined,
      errorMessage: row.error_message || undefined,
    }));
  }

  /**
   * Get logs for a product filtered by log level
   */
  getByProductIdAndLevel(productId: number, logLevel: LogLevel): ProductLog[] {
    const stmt = this.db.prepare(`
      SELECT * FROM product_logs
      WHERE product_id = ? AND log_level = ?
      ORDER BY timestamp ASC
    `);

    const rows = stmt.all(productId, logLevel) as Array<{
      id: number;
      product_id: number;
      timestamp: number;
      log_level: string;
      message: string;
      context: string | null;
      field_name: string | null;
      selector: string | null;
      element_count: number | null;
      error_message: string | null;
    }>;

    return rows.map(row => ({
      id: row.id,
      productId: row.product_id,
      timestamp: row.timestamp,
      logLevel: row.log_level as LogLevel,
      message: row.message,
      context: row.context ? JSON.parse(row.context) : undefined,
      fieldName: row.field_name || undefined,
      selector: row.selector || undefined,
      elementCount: row.element_count !== null ? row.element_count : undefined,
      errorMessage: row.error_message || undefined,
    }));
  }

  /**
   * Get logs for all products in a job
   */
  getByJobId(jobId: string): Array<ProductLog & { productUrl: string }> {
    const stmt = this.db.prepare(`
      SELECT pl.*, p.url as product_url
      FROM product_logs pl
      JOIN products p ON pl.product_id = p.id
      WHERE p.job_id = ?
      ORDER BY p.url ASC, pl.timestamp ASC
    `);

    const rows = stmt.all(jobId) as Array<{
      id: number;
      product_id: number;
      timestamp: number;
      log_level: string;
      message: string;
      context: string | null;
      field_name: string | null;
      selector: string | null;
      element_count: number | null;
      error_message: string | null;
      product_url: string;
    }>;

    return rows.map(row => ({
      id: row.id,
      productId: row.product_id,
      timestamp: row.timestamp,
      logLevel: row.log_level as LogLevel,
      message: row.message,
      context: row.context ? JSON.parse(row.context) : undefined,
      fieldName: row.field_name || undefined,
      selector: row.selector || undefined,
      elementCount: row.element_count !== null ? row.element_count : undefined,
      errorMessage: row.error_message || undefined,
      productUrl: row.product_url,
    }));
  }

  /**
   * Get count of logs by level for a product
   */
  getLogCountsByLevel(productId: number): Record<LogLevel, number> {
    const stmt = this.db.prepare(`
      SELECT log_level, COUNT(*) as count
      FROM product_logs
      WHERE product_id = ?
      GROUP BY log_level
    `);

    const rows = stmt.all(productId) as Array<{ log_level: string; count: number }>;

    const counts: Record<LogLevel, number> = {
      info: 0,
      warning: 0,
      error: 0,
      debug: 0,
    };

    for (const row of rows) {
      counts[row.log_level as LogLevel] = row.count;
    }

    return counts;
  }

  /**
   * Delete all logs for a specific product
   */
  deleteByProductId(productId: number): number {
    const stmt = this.db.prepare('DELETE FROM product_logs WHERE product_id = ?');
    const result = stmt.run(productId);
    return Number(result.changes || 0);
  }

  /**
   * Delete logs older than a specific timestamp
   */
  deleteOlderThan(timestamp: number): number {
    const stmt = this.db.prepare('DELETE FROM product_logs WHERE timestamp < ?');
    const result = stmt.run(timestamp);
    return Number(result.changes || 0);
  }
}
