import { Page } from 'patchright';
import { SiteProfile } from '../../shared/types';
import { ActionExecutor } from './ActionExecutor';
import { logInfo } from '../logger';

export class CategoryCrawler {
  private page: Page;
  private profile: SiteProfile;
  private actionExecutor: ActionExecutor;

  constructor(page: Page, profile: SiteProfile) {
    this.page = page;
    this.profile = profile;
    this.actionExecutor = new ActionExecutor();
  }

  async crawl(): Promise<string[]> {
    const allUrls = new Set<string>();

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
      urls.forEach(url => allUrls.add(url));

      logInfo(`Page ${pageCount + 1}: Found ${urls.length} products`);

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

    return Array.from(allUrls);
  }

  async extractProductUrls(): Promise<string[]> {
    const elements = await this.page.locator(this.profile.productLinkSelector).all();
    const urls: string[] = [];

    for (const element of elements) {
      const href = await element.getAttribute('href');
      if (href) {
        // Make absolute URL if relative
        const absoluteUrl = new URL(href, this.profile.categoryUrl).toString();
        urls.push(absoluteUrl);
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
