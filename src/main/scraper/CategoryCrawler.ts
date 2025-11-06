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
    // Navigate to category page
    await this.page.goto(this.profile.categoryUrl, { waitUntil: 'domcontentloaded' });
    logInfo(`Navigated to category: ${this.profile.categoryUrl}`);

    // Execute pre-actions
    await this.actionExecutor.executeSequence(this.page, this.profile.preActions);

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

    const elements = await this.page.locator(this.profile.productLinkSelector).all();
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
      }
    }

    return urls;
  }

  private async goToNextPage(): Promise<boolean> {
    if (this.profile.pagination.type === 'button' && this.profile.pagination.selector) {
      try {
        await this.page.click(this.profile.pagination.selector);
        await this.page.waitForTimeout(2000); // Wait for page load
        return true;
      } catch (error) {
        return false;
      }
    }

    return false;
  }
}
