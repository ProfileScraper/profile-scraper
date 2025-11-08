import { chromium, Browser, BrowserContext } from 'patchright';
import { SiteProfile, ProductData, ScrapeProgress } from '../../shared/types';
import { CategoryCrawler } from './CategoryCrawler';
import { ProductWorker } from './ProductWorker';
import { StorageManager } from '../storage/StorageManager';
import { CheckpointManager } from '../storage/CheckpointManager';
import { logInfo, logError } from '../logger';
import { EventEmitter } from 'events';
import { DatabaseSync } from 'node:sqlite';
import { ProductLogRepository } from '../database/ProductLogRepository';

export class ScrapeOrchestrator extends EventEmitter {
  private browser: Browser | null = null;
  private contexts: BrowserContext[] = [];
  private workers: ProductWorker[] = [];
  private profile: SiteProfile;
  private storageManager: StorageManager;
  private checkpointManager: CheckpointManager;
  private logRepo: ProductLogRepository;
  private productQueue: string[] = [];
  private processing: Set<string> = new Set();
  private isRunning = false;
  private isPaused = false;
  private crawlComplete = false;
  private successCount = 0;
  private failCount = 0;

  constructor(
    profile: SiteProfile,
    db: DatabaseSync,
    jobId: string,
    checkpointPath: string
  ) {
    super();
    this.profile = profile;
    this.storageManager = new StorageManager(db, jobId, profile.overwriteExisting || false);
    this.checkpointManager = new CheckpointManager(checkpointPath);
    this.logRepo = new ProductLogRepository(db);
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Scraper is already running');
    }

    this.isRunning = true;
    this.isPaused = false;
    logInfo('Starting scraper');

    try {
      // Emit initializing phase
      this.emit('phase', 'initializing');

      // Launch browser (default to headless unless explicitly disabled in profile)
      const headless = this.profile.headless !== false; // Default to true
      logInfo(`[Orchestrator] Profile headless setting: ${this.profile.headless}, computed: ${headless}`);

      // Log browser launch attempt
      console.log('========================================');
      console.log('[Orchestrator] Launching Browser');
      console.log('========================================');
      console.log('[Orchestrator] PLAYWRIGHT_BROWSERS_PATH:', process.env.PLAYWRIGHT_BROWSERS_PATH);
      console.log('[Orchestrator] Headless mode:', headless);
      console.log('[Orchestrator] Platform:', process.platform);
      console.log('[Orchestrator] Architecture:', process.arch);

      try {
        // Launch with enhanced stealth options to avoid bot detection
        this.browser = await chromium.launch({
          headless,
          args: [
            '--disable-blink-features=AutomationControlled', // Hide automation indicators
            '--disable-dev-shm-usage',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-infobars',
            '--disable-notifications',
            '--disable-popup-blocking',
            '--disable-save-password-bubble',
            '--disable-translate',
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-ipc-flooding-protection',
            '--password-store=basic',
            '--use-mock-keychain',
            // Randomize window size slightly to avoid fingerprinting
            `--window-size=${1920 + Math.floor(Math.random() * 100)},${1080 + Math.floor(Math.random() * 100)}`,
          ]
        });
        console.log('[Orchestrator] Browser launched successfully in', headless ? 'headless' : 'headed', 'mode');
        console.log('========================================');
        logInfo(`Browser launched in ${headless ? 'headless' : 'headed'} mode`);
      } catch (launchError) {
        console.error('========================================');
        console.error('[Orchestrator] BROWSER LAUNCH FAILED');
        console.error('========================================');
        console.error('[Orchestrator] Error:', launchError);
        console.error('[Orchestrator] Error message:', launchError instanceof Error ? launchError.message : String(launchError));
        console.error('[Orchestrator] Error stack:', launchError instanceof Error ? launchError.stack : 'N/A');
        console.error('========================================');
        throw launchError;
      }

      // Check for existing checkpoint
      const checkpoint = this.checkpointManager.load();

      if (checkpoint && checkpoint.pending.length > 0) {
        logInfo(`Resuming from checkpoint: ${checkpoint.pending.length} products remaining`);
        this.productQueue = checkpoint.pending;
        this.successCount = checkpoint.successCount;
        this.failCount = checkpoint.failCount;
      }

      // Create worker contexts with enhanced stealth settings
      for (let i = 0; i < this.profile.concurrency; i++) {
        // Randomize viewport slightly for each worker to avoid fingerprinting
        const viewportWidth = 1920 + Math.floor(Math.random() * 100);
        const viewportHeight = 1080 + Math.floor(Math.random() * 100);

        // Vary user agents slightly between workers
        const chromeVersions = ['131.0.0.0', '130.0.0.0', '129.0.0.0'];
        const randomVersion = chromeVersions[Math.floor(Math.random() * chromeVersions.length)];

        const context = await this.browser.newContext({
          userAgent: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${randomVersion} Safari/537.36`,
          viewport: { width: viewportWidth, height: viewportHeight },
          locale: 'en-US',
          timezoneId: 'America/New_York',
          permissions: ['geolocation'],
          extraHTTPHeaders: {
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-User': '?1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Ch-Ua': `"Chromium";v="${randomVersion.split('.')[0]}", "Google Chrome";v="${randomVersion.split('.')[0]}", "Not=A?Brand";v="99"`,
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"macOS"',
          }
        });

        // Enhanced automation masking with comprehensive fingerprint randomization
        await context.addInitScript(`
          // Override navigator.webdriver
          Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined,
          });

          // Add realistic Chrome runtime
          window.chrome = {
            runtime: {},
            loadTimes: function() {},
            csi: function() {},
            app: {}
          };

          // Override permissions with realistic behavior
          const originalQuery = window.navigator.permissions.query;
          window.navigator.permissions.query = (parameters) => (
            parameters.name === 'notifications' ?
              Promise.resolve({ state: Notification.permission }) :
              originalQuery(parameters)
          );

          // Add realistic plugins
          Object.defineProperty(navigator, 'plugins', {
            get: () => [
              {
                0: { type: "application/pdf", suffixes: "pdf", description: "Portable Document Format" },
                description: "Portable Document Format",
                filename: "internal-pdf-viewer",
                length: 1,
                name: "Chrome PDF Plugin"
              }
            ],
          });

          // Randomize hardware concurrency slightly
          Object.defineProperty(navigator, 'hardwareConcurrency', {
            get: () => ${8 + Math.floor(Math.random() * 8)},
          });

          // Add realistic device memory
          Object.defineProperty(navigator, 'deviceMemory', {
            get: () => ${8 + Math.floor(Math.random() * 2) * 8},
          });

          // Override WebGL vendor
          const getParameter = WebGLRenderingContext.prototype.getParameter;
          WebGLRenderingContext.prototype.getParameter = function(parameter) {
            if (parameter === 37445) return 'Intel Inc.';
            if (parameter === 37446) return 'Intel Iris OpenGL Engine';
            return getParameter.call(this, parameter);
          };

          // Add realistic battery API
          Object.defineProperty(navigator, 'getBattery', {
            value: () => Promise.resolve({
              charging: true,
              chargingTime: 0,
              dischargingTime: Infinity,
              level: ${0.8 + Math.random() * 0.2},
            }),
          });

          // Randomize screen properties slightly
          Object.defineProperty(window.screen, 'availWidth', {
            get: () => ${viewportWidth},
          });
          Object.defineProperty(window.screen, 'availHeight', {
            get: () => ${viewportHeight},
          });
        `);

        this.contexts.push(context);

        const worker = new ProductWorker(context, this.profile, this.logRepo);
        this.workers.push(worker);
      }

      if (checkpoint && checkpoint.pending.length > 0) {
        // Resume from checkpoint - start processing immediately
        this.emit('phase', 'crawling_products');
        await this.processQueue();
      } else {
        // Fresh start: crawl category pages while processing products in parallel
        this.emit('phase', 'gathering_urls');

        const crawlerContext = await this.browser.newContext({
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          viewport: { width: 1920, height: 1080 },
          locale: 'en-US',
          timezoneId: 'America/New_York',
          permissions: ['geolocation'],
          extraHTTPHeaders: {
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-User': '?1',
            'Sec-Fetch-Dest': 'document',
          }
        });

        // Mask automation indicators
        await crawlerContext.addInitScript(`
          // Override navigator.webdriver
          Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined,
          });

          // Add Chrome runtime
          window.chrome = {
            runtime: {},
          };

          // Override permissions
          const originalQuery = window.navigator.permissions.query;
          window.navigator.permissions.query = (parameters) => (
            parameters.name === 'notifications' ?
              Promise.resolve({ state: Notification.permission }) :
              originalQuery(parameters)
          );
        `);

        const crawlerPage = await crawlerContext.newPage();
        const crawler = new CategoryCrawler(crawlerPage, this.profile);

        // Listen for URL discovery and add to queue immediately
        crawler.on('urls', (urls: string[]) => {
          logInfo(`Discovered ${urls.length} new URLs, adding to queue`);
          this.productQueue.push(...urls);
          this.emitProgress();
        });

        crawler.on('complete', (totalFound: number) => {
          logInfo(`Category crawl complete: ${totalFound} total products discovered`);
          this.crawlComplete = true;
          // Transition to crawling products phase
          this.emit('phase', 'crawling_products');
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

      // Finalizing phase
      this.emit('phase', 'finalizing');

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
    while (this.isRunning) {
      // Handle pause
      while (this.isPaused && this.isRunning) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (!this.isRunning) break;

      // If queue is empty, wait for crawler or exit if crawl is complete
      if (this.productQueue.length === 0) {
        if (this.crawlComplete) {
          // Crawl is done and queue is empty - worker can exit
          break;
        }
        // Crawl still running, wait for more URLs
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }

      const url = this.productQueue.shift();
      if (!url) continue;

      // Skip if already completed
      if (this.checkpointManager.isCompleted(url)) {
        continue;
      }

      this.processing.add(url);
      this.emitProgress();

      try {
        const product = await worker.scrape(url);
        const productId = await this.storageManager.saveProduct(product);

        // Set product ID for logging and flush logs
        if (productId !== null) {
          worker.setProductId(productId);
        }

        this.checkpointManager.addCompleted(url, this.profile.name);
        this.successCount++;

        this.emit('product', product);
        logInfo(`Scraped: ${url}`);
      } catch (error) {
        this.failCount++;
        logError(`Failed to scrape: ${url}`, error as Error);
        this.emit('error', { url, error });

        // Create a failed product record so we can save logs for debugging
        try {
          const failedProduct = {
            url,
            scrapedAt: new Date().toISOString(),
            fields: {}, // Empty fields for failed scrape
          };
          const productId = await this.storageManager.saveProduct(failedProduct);
          if (productId !== null) {
            // Add final error log and flush all logs
            worker.addLog({
              logLevel: 'error',
              message: `Scrape failed completely`,
              errorMessage: (error as Error).message,
            });
            worker.setProductId(productId);
          }
        } catch (saveError) {
          console.error('[Orchestrator] Failed to save failed product for logging:', saveError);
        }
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
