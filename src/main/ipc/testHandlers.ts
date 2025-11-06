import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { chromium } from 'patchright';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import { SiteProfile, ProductData } from '../../shared/types';
import { CategoryCrawler } from '../scraper/CategoryCrawler';
import { ProductWorker } from '../scraper/ProductWorker';
import { logInfo, logError } from '../logger';

export interface ProfileTestResult {
  success: boolean;
  categoryPage?: {
    url: string;
    urlsFound: string[];
    error?: string;
  };
  productPage?: {
    url: string;
    data: ProductData;
    error?: string;
  };
  error?: string;
}

export function setupTestHandlers(): void {
  /**
   * Test a profile with 1 category page and 1 product
   */
  ipcMain.handle(IPC_CHANNELS.PROFILE_TEST, async (event: IpcMainInvokeEvent, profile: SiteProfile): Promise<ProfileTestResult> => {
    logInfo('[Test] Starting profile test');

    let browser = null;

    try {
      // Launch browser in headed mode for testing (user can see what's happening)
      browser = await chromium.launch({ headless: false });
      const context = await browser.newContext();

      const result: ProfileTestResult = {
        success: false,
      };

      // Step 1: Test category page crawling
      logInfo('[Test] Testing category page crawling');
      try {
        const crawlerPage = await context.newPage();
        const crawler = new CategoryCrawler(crawlerPage, profile);

        // Listen for URLs
        const foundUrls: string[] = [];
        crawler.on('urls', (urls: string[]) => {
          foundUrls.push(...urls);
          logInfo(`[Test] Found ${urls.length} URLs`);
        });

        // Manually navigate and extract from first page only
        await crawlerPage.goto(profile.categoryUrl, { waitUntil: 'domcontentloaded' });

        // Execute pre-actions if any
        if (profile.preActions && profile.preActions.length > 0) {
          const { ActionExecutor } = await import('../scraper/ActionExecutor');
          const executor = new ActionExecutor();
          await executor.executeSequence(crawlerPage, profile.preActions);
        }

        // Extract product URLs from first page only
        const urls = await crawler.extractProductUrls();

        result.categoryPage = {
          url: profile.categoryUrl,
          urlsFound: urls,
        };

        await crawlerPage.close();

        // Step 2: Test product scraping on first URL
        if (urls.length > 0) {
          logInfo(`[Test] Testing product scraping on: ${urls[0]}`);
          try {
            const worker = new ProductWorker(context, profile);
            const productData = await worker.scrape(urls[0]);

            result.productPage = {
              url: urls[0],
              data: productData,
            };

            await worker.close();
          } catch (productError) {
            logError('[Test] Product scraping failed', productError as Error);
            result.productPage = {
              url: urls[0],
              data: { url: urls[0], scrapedAt: new Date().toISOString(), fields: {} },
              error: productError instanceof Error ? productError.message : String(productError),
            };
          }
        } else {
          result.categoryPage.error = 'No product URLs found on category page';
        }

        result.success = true;
      } catch (categoryError) {
        logError('[Test] Category crawling failed', categoryError as Error);
        result.categoryPage = {
          url: profile.categoryUrl,
          urlsFound: [],
          error: categoryError instanceof Error ? categoryError.message : String(categoryError),
        };
      }

      return result;
    } catch (error) {
      logError('[Test] Test failed', error as Error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      if (browser) {
        await browser.close();
      }
      logInfo('[Test] Test complete');
    }
  });
}
