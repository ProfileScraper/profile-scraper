import { DatabaseSync } from 'node:sqlite';
import { ProductData } from '../../shared/types';

export interface ProductRow {
  id: number;
  job_id: string;
  url: string;
  scraped_at: number;
}

export interface ScrapeDataRow {
  id: number;
  product_id: number;
  field_name: string;
  field_value: string | null;
}

export interface ProductWithFields extends ProductRow {
  fields: Record<string, string>;
}

export interface ProductFilter {
  jobId?: string;
  url?: string;
  fieldName?: string;
  fieldValue?: string;
  fromDate?: number;
  toDate?: number;
  limit?: number;
  offset?: number;
}

export class ProductRepository {
  constructor(private db: DatabaseSync) {}

  /**
   * Save a product and its field data to the database
   * Returns the product ID
   */
  create(jobId: string, product: ProductData): number {
    const insertProduct = this.db.prepare(`
      INSERT INTO products (job_id, url, scraped_at)
      VALUES (?, ?, ?)
    `);

    const insertField = this.db.prepare(`
      INSERT INTO scrape_data (product_id, field_name, field_value)
      VALUES (?, ?, ?)
    `);

    try {
      // Wrap in explicit transaction for atomicity
      this.db.exec('BEGIN TRANSACTION');

      const result = insertProduct.run(jobId, product.url, Date.parse(product.scrapedAt));
      const productId = result.lastInsertRowid as number;

      // Insert field data
      for (const [fieldName, fieldValue] of Object.entries(product.fields)) {
        insertField.run(productId, fieldName, fieldValue);
      }

      this.db.exec('COMMIT');
      return productId;
    } catch (error) {
      // Rollback on any error
      this.db.exec('ROLLBACK');

      // Check for UNIQUE constraint violation (duplicate URL in same job)
      if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
        throw new Error(`Duplicate product URL in job: ${product.url}`);
      }
      throw error;
    }
  }

  /**
   * Update an existing product's field data
   * Used when overwriteExisting is enabled
   */
  update(jobId: string, product: ProductData): void {
    // Find existing product
    const findStmt = this.db.prepare(`
      SELECT id FROM products WHERE job_id = ? AND url = ?
    `);
    const existing = findStmt.get(jobId, product.url) as { id: number } | undefined;

    if (!existing) {
      throw new Error(`Product not found: ${product.url}`);
    }

    const updateProduct = this.db.prepare(`
      UPDATE products SET scraped_at = ? WHERE id = ?
    `);

    const deleteFields = this.db.prepare(`
      DELETE FROM scrape_data WHERE product_id = ?
    `);

    const insertField = this.db.prepare(`
      INSERT INTO scrape_data (product_id, field_name, field_value)
      VALUES (?, ?, ?)
    `);

    try {
      // Wrap in explicit transaction for atomicity
      this.db.exec('BEGIN TRANSACTION');

      // Update scraped_at timestamp
      updateProduct.run(Date.parse(product.scrapedAt), existing.id);

      // Delete old field data
      deleteFields.run(existing.id);

      // Insert new field data
      for (const [fieldName, fieldValue] of Object.entries(product.fields)) {
        insertField.run(existing.id, fieldName, fieldValue);
      }

      this.db.exec('COMMIT');
    } catch (error) {
      // Rollback on any error
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  /**
   * Check if a product URL exists in a specific job
   */
  exists(jobId: string, url: string): boolean {
    const stmt = this.db.prepare(`
      SELECT 1 FROM products WHERE job_id = ? AND url = ? LIMIT 1
    `);
    const result = stmt.get(jobId, url);
    return result !== undefined;
  }

  /**
   * Get a single product with all its fields
   */
  getById(productId: number): ProductWithFields | null {
    const productStmt = this.db.prepare(`
      SELECT * FROM products WHERE id = ?
    `);
    const product = productStmt.get(productId) as ProductRow | undefined;

    if (!product) return null;

    const fieldsStmt = this.db.prepare(`
      SELECT field_name, field_value FROM scrape_data WHERE product_id = ?
    `);
    const fieldRows = fieldsStmt.all(productId) as unknown as ScrapeDataRow[];

    const fields: Record<string, string> = {};
    for (const row of fieldRows) {
      fields[row.field_name] = row.field_value || '';
    }

    return {
      ...product,
      fields,
    };
  }

  /**
   * Get products for a specific job with pagination
   */
  getByJobId(jobId: string, limit: number = 100, offset: number = 0): ProductWithFields[] {
    const productStmt = this.db.prepare(`
      SELECT * FROM products
      WHERE job_id = ?
      ORDER BY scraped_at DESC
      LIMIT ? OFFSET ?
    `);
    const products = productStmt.all(jobId, limit, offset) as unknown as ProductRow[];

    return products.map(product => {
      const fieldsStmt = this.db.prepare(`
        SELECT field_name, field_value FROM scrape_data WHERE product_id = ?
      `);
      const fieldRows = fieldsStmt.all(product.id) as unknown as ScrapeDataRow[];

      const fields: Record<string, string> = {};
      for (const row of fieldRows) {
        fields[row.field_name] = row.field_value || '';
      }

      return {
        ...product,
        fields,
      };
    });
  }

  /**
   * Get count of products for a job
   */
  countByJobId(jobId: string): number {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM products WHERE job_id = ?
    `);
    const result = stmt.get(jobId) as { count: number };
    return result.count;
  }

  /**
   * Search products with flexible filtering
   */
  search(filter: ProductFilter): ProductWithFields[] {
    let query = 'SELECT DISTINCT p.* FROM products p';
    const params: any[] = [];

    // Join with scrape_data if filtering by field
    if (filter.fieldName || filter.fieldValue) {
      query += ' JOIN scrape_data sd ON p.id = sd.product_id';
    }

    const conditions: string[] = [];

    if (filter.jobId) {
      conditions.push('p.job_id = ?');
      params.push(filter.jobId);
    }

    if (filter.url) {
      conditions.push('p.url LIKE ?');
      params.push(`%${filter.url}%`);
    }

    if (filter.fieldName) {
      conditions.push('sd.field_name = ?');
      params.push(filter.fieldName);
    }

    if (filter.fieldValue) {
      conditions.push('sd.field_value LIKE ?');
      params.push(`%${filter.fieldValue}%`);
    }

    if (filter.fromDate) {
      conditions.push('p.scraped_at >= ?');
      params.push(filter.fromDate);
    }

    if (filter.toDate) {
      conditions.push('p.scraped_at <= ?');
      params.push(filter.toDate);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY p.scraped_at DESC';

    if (filter.limit) {
      query += ' LIMIT ?';
      params.push(filter.limit);
    }

    if (filter.offset) {
      query += ' OFFSET ?';
      params.push(filter.offset);
    }

    const stmt = this.db.prepare(query);
    const products = stmt.all(...params) as unknown as ProductRow[];

    return products.map(product => {
      const fieldsStmt = this.db.prepare(`
        SELECT field_name, field_value FROM scrape_data WHERE product_id = ?
      `);
      const fieldRows = fieldsStmt.all(product.id) as unknown as ScrapeDataRow[];

      const fields: Record<string, string> = {};
      for (const row of fieldRows) {
        fields[row.field_name] = row.field_value || '';
      }

      return {
        ...product,
        fields,
      };
    });
  }

  /**
   * Delete all products for a specific job
   */
  deleteByJobId(jobId: string): number {
    const stmt = this.db.prepare(`
      DELETE FROM products WHERE job_id = ?
    `);
    const result = stmt.run(jobId);
    return Number(result.changes || 0);
  }

  /**
   * Delete products older than a specific timestamp
   */
  deleteOlderThan(timestamp: number): number {
    const stmt = this.db.prepare(`
      DELETE FROM products WHERE scraped_at < ?
    `);
    const result = stmt.run(timestamp);
    return Number(result.changes || 0);
  }

  /**
   * Delete a specific product by ID
   */
  deleteById(productId: number): void {
    const stmt = this.db.prepare(`
      DELETE FROM products WHERE id = ?
    `);
    stmt.run(productId);
  }

  /**
   * Get all unique field names across all products
   */
  getFieldNames(jobId?: string): string[] {
    let query = 'SELECT DISTINCT field_name FROM scrape_data';
    const params: any[] = [];

    if (jobId) {
      query += ' WHERE product_id IN (SELECT id FROM products WHERE job_id = ?)';
      params.push(jobId);
    }

    query += ' ORDER BY field_name';

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as { field_name: string }[];
    return rows.map(r => r.field_name);
  }

  /**
   * Get total database size metrics
   */
  getStats(): { totalProducts: number; totalFields: number; oldestScrape: number | null; newestScrape: number | null } {
    const productCount = this.db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number };
    const fieldCount = this.db.prepare('SELECT COUNT(*) as count FROM scrape_data').get() as { count: number };
    const dateRange = this.db.prepare('SELECT MIN(scraped_at) as oldest, MAX(scraped_at) as newest FROM products').get() as { oldest: number | null; newest: number | null };

    return {
      totalProducts: productCount.count,
      totalFields: fieldCount.count,
      oldestScrape: dateRange.oldest,
      newestScrape: dateRange.newest,
    };
  }

  /**
   * Get data quality statistics for a specific job
   */
  getJobQualityStats(jobId: string): {
    totalProducts: number;
    totalFields: number;
    emptyFields: number;
    nullFields: number;
    productsWithEmptyFields: number;
    fieldStats: Array<{ fieldName: string; emptyCount: number; nullCount: number; fillRate: number }>;
  } {
    // Get total products for this job
    const totalProducts = this.countByJobId(jobId);

    if (totalProducts === 0) {
      return {
        totalProducts: 0,
        totalFields: 0,
        emptyFields: 0,
        nullFields: 0,
        productsWithEmptyFields: 0,
        fieldStats: [],
      };
    }

    // Get all field data for this job
    const fieldDataStmt = this.db.prepare(`
      SELECT sd.field_name, sd.field_value, p.id as product_id
      FROM scrape_data sd
      JOIN products p ON sd.product_id = p.id
      WHERE p.job_id = ?
    `);
    const fieldData = fieldDataStmt.all(jobId) as unknown as Array<{
      field_name: string;
      field_value: string | null;
      product_id: number;
    }>;

    const totalFields = fieldData.length;
    let emptyFields = 0;
    let nullFields = 0;
    const productsWithEmpty = new Set<number>();
    const fieldStatsMap = new Map<string, { empty: number; null: number; total: number }>();

    // Analyze each field
    for (const field of fieldData) {
      const isEmpty = field.field_value === '' || field.field_value === null;
      const isNull = field.field_value === null;

      if (isEmpty) {
        emptyFields++;
        productsWithEmpty.add(field.product_id);
      }
      if (isNull) {
        nullFields++;
      }

      // Track per-field statistics
      if (!fieldStatsMap.has(field.field_name)) {
        fieldStatsMap.set(field.field_name, { empty: 0, null: 0, total: 0 });
      }
      const stats = fieldStatsMap.get(field.field_name)!;
      stats.total++;
      if (isEmpty) stats.empty++;
      if (isNull) stats.null++;
    }

    // Calculate field-level stats
    const fieldStats = Array.from(fieldStatsMap.entries()).map(([fieldName, stats]) => ({
      fieldName,
      emptyCount: stats.empty,
      nullCount: stats.null,
      fillRate: Math.round(((stats.total - stats.empty) / stats.total) * 100),
    })).sort((a, b) => a.fillRate - b.fillRate); // Sort by fill rate (worst first)

    return {
      totalProducts,
      totalFields,
      emptyFields,
      nullFields,
      productsWithEmptyFields: productsWithEmpty.size,
      fieldStats,
    };
  }
}
