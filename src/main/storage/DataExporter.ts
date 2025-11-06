import * as fs from 'fs';
import * as path from 'path';
import { ProductRepository, ProductFilter } from '../database/ProductRepository';
import { DatabaseSync } from 'node:sqlite';
import { createObjectCsvWriter } from 'csv-writer';

export class DataExporter {
  private productRepo: ProductRepository;

  constructor(private db: DatabaseSync) {
    this.productRepo = new ProductRepository(db);
  }

  /**
   * Export products to JSON file
   */
  async exportToJSON(outputPath: string, filter?: ProductFilter): Promise<number> {
    const products = this.productRepo.search(filter || {});

    const jsonData = products.map(p => ({
      url: p.url,
      scrapedAt: new Date(p.scraped_at).toISOString(),
      fields: p.fields,
    }));

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2));
    console.log(`[DataExporter] Exported ${products.length} products to JSON: ${outputPath}`);

    return products.length;
  }

  /**
   * Export products to CSV file
   */
  async exportToCSV(outputPath: string, filter?: ProductFilter): Promise<number> {
    const products = this.productRepo.search(filter || {});

    if (products.length === 0) {
      console.log('[DataExporter] No products to export');
      return 0;
    }

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Get all unique field names across all products
    const allFields = new Set<string>();
    products.forEach(p => {
      Object.keys(p.fields).forEach(key => allFields.add(key));
    });

    const headers = [
      'url',
      'scrapedAt',
      ...Array.from(allFields).sort(),
    ];

    // Create CSV writer
    const csvWriter = createObjectCsvWriter({
      path: outputPath,
      header: headers.map(h => ({ id: h, title: h })),
    });

    // Write records
    const records = products.map(p => ({
      url: p.url,
      scrapedAt: new Date(p.scraped_at).toISOString(),
      ...p.fields,
    }));

    await csvWriter.writeRecords(records);
    console.log(`[DataExporter] Exported ${products.length} products to CSV: ${outputPath}`);

    return products.length;
  }

  /**
   * Export all products for a specific job
   */
  async exportJobData(jobId: string, outputDir: string, format: 'json' | 'csv' | 'both' = 'both'): Promise<{ json?: string; csv?: string; count: number }> {
    const filter: ProductFilter = { jobId };
    const result: { json?: string; csv?: string; count: number } = { count: 0 };

    if (format === 'json' || format === 'both') {
      const jsonPath = path.join(outputDir, `job_${jobId}_data.json`);
      result.count = await this.exportToJSON(jsonPath, filter);
      result.json = jsonPath;
    }

    if (format === 'csv' || format === 'both') {
      const csvPath = path.join(outputDir, `job_${jobId}_data.csv`);
      const count = await this.exportToCSV(csvPath, filter);
      result.count = count;
      result.csv = csvPath;
    }

    return result;
  }

  /**
   * Export filtered data with custom query
   */
  async exportFiltered(
    outputPath: string,
    format: 'json' | 'csv',
    filter: ProductFilter
  ): Promise<number> {
    if (format === 'json') {
      return this.exportToJSON(outputPath, filter);
    } else {
      return this.exportToCSV(outputPath, filter);
    }
  }

  /**
   * Get preview of data that would be exported (first N rows)
   */
  getExportPreview(filter: ProductFilter, limit: number = 10): any[] {
    const previewFilter = { ...filter, limit };
    const products = this.productRepo.search(previewFilter);

    return products.map(p => ({
      url: p.url,
      scrapedAt: new Date(p.scraped_at).toISOString(),
      fields: p.fields,
    }));
  }
}
