import { Page } from 'patchright';
import { EventEmitter } from 'events';
import { SiteProfile } from '../../shared/types';
import { ActionExecutor } from './ActionExecutor';
import { logInfo } from '../logger';

export class CategoryCrawler extends EventEmitter {
  private page: Page;
  private profile: SiteProfile;
  private actionExecutor: ActionExecutor;
  private discoveredUrls: Set<string>;

  constructor(page: Page, profile: SiteProfile) {
    super();
    this.page = page;
    this.profile = profile;
    this.actionExecutor = new ActionExecutor();
    this.discoveredUrls = new Set<string>();
  }

  async crawl(): Promise<void> {
    // Navigate to category page with realistic timeout
    await this.page.goto(this.profile.categoryUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    logInfo(`Navigated to category: ${this.profile.categoryUrl}`);

    // Add small random delay to simulate human page load time
    const initialDelay = 500 + Math.floor(Math.random() * 1000); // 500-1500ms
    await this.page.waitForTimeout(initialDelay);

    // Simulate realistic mouse movement on category page
    try {
      await this.page.mouse.move(
        Math.floor(Math.random() * 800) + 100,
        Math.floor(Math.random() * 600) + 100,
        { steps: 10 }
      );
    } catch (err) {
      // Ignore mouse movement errors
    }

    // Execute pre-actions
    await this.actionExecutor.executeSequence(this.page, this.profile.preActions);

    // Wait for product links to appear (with timeout)
    if (this.profile.productLinkSelector) {
      try {
        logInfo(`[CategoryCrawler] Waiting for product links to appear...`);
        await this.page.waitForSelector(this.profile.productLinkSelector, { timeout: 10000 });
        logInfo(`[CategoryCrawler] Product links detected on page`);
      } catch (error) {
        logInfo(`[CategoryCrawler] Warning: Product link selector not found after 10s, proceeding anyway`);
      }
    }

    let pageCount = 0;
    const maxPages = this.profile.pagination.maxPages;

    while (pageCount < maxPages) {
      // Extract product URLs from current page
      const urls = await this.extractProductUrls();

      // Emit new URLs immediately as they're discovered
      const newUrls: string[] = [];
      urls.forEach(url => {
        if (!this.discoveredUrls.has(url)) {
          this.discoveredUrls.add(url);
          newUrls.push(url);
        }
      });

      if (newUrls.length > 0) {
        this.emit('urls', newUrls);
        logInfo(`Page ${pageCount + 1}: Found ${newUrls.length} new products (${urls.length} total on page)`);
      } else {
        logInfo(`Page ${pageCount + 1}: No new products found (${urls.length} duplicates)`);
      }

      pageCount++;

      // Try to go to next page
      if (pageCount < maxPages) {
        const hasNext = await this.goToNextPage();
        if (!hasNext) {
          logInfo('No more pages to crawl');
          break;
        }
      }
    }

    // Emit completion event
    this.emit('complete', this.discoveredUrls.size);
    logInfo(`Category crawl complete: ${this.discoveredUrls.size} unique products found across ${pageCount} pages`);
  }

  async extractProductUrls(): Promise<string[]> {
    if (!this.profile.productLinkSelector) {
      throw new Error('productLinkSelector is required for crawling category pages');
    }

    logInfo(`[CategoryCrawler] Searching for product links using selector: ${this.profile.productLinkSelector}`);

    const elements = await this.page.locator(this.profile.productLinkSelector).all();
    logInfo(`[CategoryCrawler] Found ${elements.length} elements matching selector`);

    // If no elements found, debug the page content
    if (elements.length === 0) {
      logInfo(`[CategoryCrawler] DEBUG: No elements found, capturing page info...`);

      // Get page title
      const title = await this.page.title();
      logInfo(`[CategoryCrawler] Page title: ${title}`);

      // Get body text (first 500 chars)
      const bodyText = await this.page.textContent('body');
      logInfo(`[CategoryCrawler] Body text (first 500 chars): ${bodyText?.substring(0, 500)}`);

      // Check for common bot detection indicators
      const bodyHTML = await this.page.innerHTML('body');
      if (bodyHTML.toLowerCase().includes('captcha')) {
        logInfo(`[CategoryCrawler] DETECTED: Page contains CAPTCHA`);
      }
      if (bodyHTML.toLowerCase().includes('bot') || bodyHTML.toLowerCase().includes('robot')) {
        logInfo(`[CategoryCrawler] DETECTED: Page mentions bots/robots`);
      }
      if (bodyHTML.toLowerCase().includes('access denied') || bodyHTML.toLowerCase().includes('blocked')) {
        logInfo(`[CategoryCrawler] DETECTED: Page indicates access denied/blocked`);
      }

      // Log all data-selenium attributes to see what IS on the page
      const dataSeleniumElements = await this.page.locator('[data-selenium]').all();
      logInfo(`[CategoryCrawler] Found ${dataSeleniumElements.length} elements with data-selenium attribute`);
      if (dataSeleniumElements.length > 0) {
        const samples = Math.min(10, dataSeleniumElements.length);
        for (let i = 0; i < samples; i++) {
          const attr = await dataSeleniumElements[i].getAttribute('data-selenium');
          logInfo(`[CategoryCrawler] data-selenium="${attr}"`);
        }
      }
    }

    const urls: string[] = [];

    for (const element of elements) {
      const href = await element.getAttribute('href');
      if (href) {
        // Make absolute URL if prependDomain is enabled or if href is relative
        let url = href;
        if (this.profile.prependDomain || !href.startsWith('http')) {
          url = new URL(href, this.profile.categoryUrl).toString();
        }
        urls.push(url);
        logInfo(`[CategoryCrawler] Extracted URL: ${url}`);
      } else {
        logInfo(`[CategoryCrawler] Element found but has no href attribute`);
      }
    }

    logInfo(`[CategoryCrawler] Total URLs extracted: ${urls.length}`);
    return urls;
  }

  private async goToNextPage(): Promise<boolean> {
    if (this.profile.pagination.type === 'button' && this.profile.pagination.selector) {
      try {
        await this.page.click(this.profile.pagination.selector);
        await this.page.waitForTimeout(2000); // Wait for page load

        // Wait for product links to appear on next page
        if (this.profile.productLinkSelector) {
          try {
            await this.page.waitForSelector(this.profile.productLinkSelector, { timeout: 10000 });
            logInfo(`[CategoryCrawler] Product links loaded on next page`);
          } catch (error) {
            logInfo(`[CategoryCrawler] Warning: Product links not found on next page after 10s`);
          }
        }

        return true;
      } catch (error) {
        return false;
      }
    }

    return false;
  }
}
