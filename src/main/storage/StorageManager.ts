import { ProductData } from '../../shared/types';
import { ProductRepository } from '../database/ProductRepository';
import { DatabaseSync } from 'node:sqlite';

export class StorageManager {
  private productRepo: ProductRepository;
  private jobId: string;
  private overwriteExisting: boolean;

  constructor(db: DatabaseSync, jobId: string, overwriteExisting: boolean = false) {
    this.productRepo = new ProductRepository(db);
    this.jobId = jobId;
    this.overwriteExisting = overwriteExisting;
  }

  async saveProduct(product: ProductData): Promise<number | null> {
    try {
      if (!this.overwriteExisting) {
        // Default behavior: insert new product (will throw on duplicate due to UNIQUE constraint)
        try {
          const productId = this.productRepo.create(this.jobId, product);
          return productId;
        } catch (error) {
          // Silently skip duplicates in append-only mode
          if (error instanceof Error && error.message.includes('Duplicate product URL')) {
            console.log(`[StorageManager] Skipping duplicate URL: ${product.url}`);
            return null; // Return null for skipped duplicates
          }
          throw error;
        }
      } else {
        // Overwrite mode: update if exists, create if not
        if (this.productRepo.exists(this.jobId, product.url)) {
          this.productRepo.update(this.jobId, product);
          console.log(`[StorageManager] Updated existing product: ${product.url}`);
          // For updates, we need to get the existing product ID
          const existing = this.productRepo.getByJobId(this.jobId, 1, 0).find(p => p.url === product.url);
          return existing?.id || null;
        } else {
          const productId = this.productRepo.create(this.jobId, product);
          console.log(`[StorageManager] Created new product: ${product.url}`);
          return productId;
        }
      }
    } catch (error) {
      console.error(`[StorageManager] Failed to save product: ${product.url}`, error);
      throw error;
    }
  }

  /**
   * Get products for this job with pagination
   */
  getProducts(limit: number = 100, offset: number = 0): ProductData[] {
    const products = this.productRepo.getByJobId(this.jobId, limit, offset);

    return products.map(p => ({
      url: p.url,
      scrapedAt: new Date(p.scraped_at).toISOString(),
      fields: p.fields,
    }));
  }

  /**
   * Get total count of products for this job
   */
  getProductCount(): number {
    return this.productRepo.countByJobId(this.jobId);
  }

  /**
   * Clear all products for this job
   */
  clear(): void {
    const deleted = this.productRepo.deleteByJobId(this.jobId);
    console.log(`[StorageManager] Cleared ${deleted} products for job ${this.jobId}`);
  }
}
