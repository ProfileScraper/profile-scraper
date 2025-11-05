import * as fs from 'fs';
import * as path from 'path';
import { ProductData } from '../../shared/types';
import { createObjectCsvWriter } from 'csv-writer';

export class StorageManager {
  private outputDir: string;
  private jsonPath: string;
  private csvPath: string;
  private products: ProductData[] = [];
  private csvWriter: any;
  private csvInitialized = false;

  constructor(outputDir: string) {
    this.outputDir = outputDir;
    this.jsonPath = path.join(outputDir, 'data.json');
    this.csvPath = path.join(outputDir, 'data.csv');

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Load existing data if present
    if (fs.existsSync(this.jsonPath)) {
      const data = fs.readFileSync(this.jsonPath, 'utf-8');
      this.products = JSON.parse(data);
    }
  }

  async saveProduct(product: ProductData): Promise<void> {
    this.products.push(product);

    // Save to JSON
    fs.writeFileSync(this.jsonPath, JSON.stringify(this.products, null, 2));

    // Save to CSV
    await this.appendToCSV(product);
  }

  private async appendToCSV(product: ProductData): Promise<void> {
    // Get all unique field keys across all products
    const allFields = new Set<string>();
    this.products.forEach(p => {
      Object.keys(p.fields).forEach(key => allFields.add(key));
    });

    const headers = [
      ...Array.from(allFields).sort(),
      'url',
      'scrapedAt',
    ];

    if (!this.csvInitialized) {
      // Create CSV with headers
      this.csvWriter = createObjectCsvWriter({
        path: this.csvPath,
        header: headers.map(h => ({ id: h, title: h })),
      });
      this.csvInitialized = true;

      // Write all products (including new one)
      const records = this.products.map(p => ({
        ...p.fields,
        url: p.url,
        scrapedAt: p.scrapedAt,
      }));

      await this.csvWriter.writeRecords(records);
    } else {
      // Append mode: write only the new product
      this.csvWriter = createObjectCsvWriter({
        path: this.csvPath,
        header: headers.map(h => ({ id: h, title: h })),
        append: true,
      });

      const record = {
        ...product.fields,
        url: product.url,
        scrapedAt: product.scrapedAt,
      };

      await this.csvWriter.writeRecords([record]);
    }
  }

  getProducts(): ProductData[] {
    return this.products;
  }

  clear(): void {
    this.products = [];
    if (fs.existsSync(this.jsonPath)) {
      fs.unlinkSync(this.jsonPath);
    }
    if (fs.existsSync(this.csvPath)) {
      fs.unlinkSync(this.csvPath);
    }
    this.csvInitialized = false;
  }
}
