import { chromium, Browser, BrowserContext } from 'patchright';
import { SiteProfile, ProductData, ScrapeProgress } from '../../shared/types';
import { CategoryCrawler } from './CategoryCrawler';
import { ProductWorker } from './ProductWorker';
import { StorageManager } from '../storage/StorageManager';
import { CheckpointManager } from '../storage/CheckpointManager';
import { logInfo, logError } from '../logger';
import { EventEmitter } from 'events';

export class ScrapeOrchestrator extends EventEmitter {
  private browser: Browser | null = null;
  private contexts: BrowserContext[] = [];
  private workers: ProductWorker[] = [];
  private profile: SiteProfile;
  private storageManager: StorageManager;
  private checkpointManager: CheckpointManager;
  private productQueue: string[] = [];
  private processing: Set<string> = new Set();
  private isRunning = false;
  private isPaused = false;
  private successCount = 0;
  private failCount = 0;

  constructor(
    profile: SiteProfile,
    outputDir: string,
    checkpointPath: string
  ) {
    super();
    this.profile = profile;
    this.storageManager = new StorageManager(outputDir);
    this.checkpointManager = new CheckpointManager(checkpointPath);
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Scraper is already running');
    }

    this.isRunning = true;
    this.isPaused = false;
    logInfo('Starting scraper');

    try {
      // Launch browser (default to headless unless explicitly disabled in profile)
      const headless = this.profile.headless !== false; // Default to true
      this.browser = await chromium.launch({ headless });
      logInfo(`Browser launched in ${headless ? 'headless' : 'headed'} mode`);

      // Check for existing checkpoint
      const checkpoint = this.checkpointManager.load();

      if (checkpoint && checkpoint.pending.length > 0) {
        logInfo(`Resuming from checkpoint: ${checkpoint.pending.length} products remaining`);
        this.productQueue = checkpoint.pending;
        this.successCount = checkpoint.successCount;
        this.failCount = checkpoint.failCount;
      }

      // Create worker contexts
      for (let i = 0; i < this.profile.concurrency; i++) {
        const context = await this.browser.newContext();
        this.contexts.push(context);

        const worker = new ProductWorker(context, this.profile);
        this.workers.push(worker);
      }

      if (checkpoint && checkpoint.pending.length > 0) {
        // Resume from checkpoint - start processing immediately
        await this.processQueue();
      } else {
        // Fresh start: crawl category pages while processing products in parallel
        const crawlerContext = await this.browser.newContext();
        const crawlerPage = await crawlerContext.newPage();
        const crawler = new CategoryCrawler(crawlerPage, this.profile);

        let crawlComplete = false;

        // Listen for URL discovery and add to queue immediately
        crawler.on('urls', (urls: string[]) => {
          logInfo(`Discovered ${urls.length} new URLs, adding to queue`);
          this.productQueue.push(...urls);
          this.emitProgress();
        });

        crawler.on('complete', (totalFound: number) => {
          logInfo(`Category crawl complete: ${totalFound} total products discovered`);
          crawlComplete = true;
        });

        // Start crawling in parallel with processing
        const crawlPromise = crawler.crawl().then(async () => {
          await crawlerPage.close();
          await crawlerContext.close();
        });

        const processPromise = this.processQueue();

        // Wait for both crawling and processing to complete
        await Promise.all([crawlPromise, processPromise]);
      }

      this.emit('complete', {
        successCount: this.successCount,
        failCount: this.failCount,
      });

      logInfo('Scraping complete');
    } catch (error) {
      logError('Scraping failed', error as Error);
      this.emit('error', error);
    } finally {
      await this.cleanup();
    }
  }

  private async processQueue(): Promise<void> {
    const workerPromises: Promise<void>[] = [];

    for (const worker of this.workers) {
      workerPromises.push(this.workerLoop(worker));
    }

    await Promise.all(workerPromises);
  }

  private async workerLoop(worker: ProductWorker): Promise<void> {
    while (this.productQueue.length > 0 && this.isRunning) {
      // Handle pause
      while (this.isPaused && this.isRunning) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (!this.isRunning) break;

      const url = this.productQueue.shift();
      if (!url) break;

      // Skip if already completed
      if (this.checkpointManager.isCompleted(url)) {
        continue;
      }

      this.processing.add(url);
      this.emitProgress();

      try {
        const product = await worker.scrape(url);
        await this.storageManager.saveProduct(product);
        this.checkpointManager.addCompleted(url, this.profile.name);
        this.successCount++;

        this.emit('product', product);
        logInfo(`Scraped: ${url}`);
      } catch (error) {
        this.failCount++;
        logError(`Failed to scrape: ${url}`, error as Error);
        this.emit('error', { url, error });
      } finally {
        this.processing.delete(url);
        this.emitProgress();

        // Checkpoint every N products
        if ((this.successCount + this.failCount) % this.profile.checkpointInterval === 0) {
          this.saveCheckpoint();
        }
      }
    }
  }

  private emitProgress(): void {
    const progress: ScrapeProgress = {
      productsScraped: this.successCount,
      totalProducts: this.successCount + this.failCount + this.productQueue.length + this.processing.size,
      successCount: this.successCount,
      failCount: this.failCount,
      currentUrls: Array.from(this.processing),
      eta: this.calculateETA(),
    };

    this.emit('progress', progress);
  }

  private calculateETA(): number | null {
    // Simple ETA calculation (can be improved)
    if (this.successCount === 0) return null;

    const remaining = this.productQueue.length;
    const avgTimePerProduct = 5000; // Assume 5s per product
    return remaining * avgTimePerProduct;
  }

  private saveCheckpoint(): void {
    this.checkpointManager.save({
      timestamp: new Date().toISOString(),
      profileName: this.profile.name,
      completed: this.checkpointManager.getCompleted(),
      pending: this.productQueue,
      totalProducts: this.successCount + this.failCount + this.productQueue.length,
      successCount: this.successCount,
      failCount: this.failCount,
    });
    logInfo('Checkpoint saved');
  }

  pause(): void {
    this.isPaused = true;
    logInfo('Scraper paused');
  }

  resume(): void {
    this.isPaused = false;
    logInfo('Scraper resumed');
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    this.saveCheckpoint();
    await this.cleanup();
    logInfo('Scraper stopped');
  }

  private async cleanup(): Promise<void> {
    for (const worker of this.workers) {
      await worker.close();
    }

    for (const context of this.contexts) {
      await context.close();
    }

    if (this.browser) {
      await this.browser.close();
    }

    this.workers = [];
    this.contexts = [];
    this.browser = null;
    this.isRunning = false;
  }
}
