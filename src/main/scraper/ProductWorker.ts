import { BrowserContext, Page } from 'patchright';
import { ProductData, SiteProfile } from '../../shared/types';
import { ActionExecutor } from './ActionExecutor';
import { logError, logInfo, logWarning } from '../logger';

export class ProductWorker {
  private context: BrowserContext;
  private profile: SiteProfile;
  private actionExecutor: ActionExecutor;
  private page: Page | null = null;

  constructor(context: BrowserContext, profile: SiteProfile) {
    this.context = context;
    this.profile = profile;
    this.actionExecutor = new ActionExecutor();
  }

  async scrape(url: string): Promise<ProductData> {
    const product: ProductData = {
      url,
      scrapedAt: new Date().toISOString(),
      fields: {},
    };

    let attempt = 0;
    const maxRetries = this.profile.retries;

    while (attempt < maxRetries) {
      try {
        // Create new page if needed
        if (!this.page) {
          this.page = await this.context.newPage();
        }

        // Navigate to product page
        await this.page.goto(url, { waitUntil: 'domcontentloaded' });
        logInfo(`Navigated to ${url}`);

        // Execute product page actions
        await this.actionExecutor.executeSequence(this.page, this.profile.productPageActions);

        // Extract fields
        for (const [fieldName, selectorValue] of Object.entries(this.profile.fieldSelectors)) {
          try {
            // Handle both string selector and FieldSelector object
            const isObject = typeof selectorValue === 'object' && selectorValue !== null;
            const selector = isObject ? selectorValue.selector : selectorValue;
            const attribute = isObject ? selectorValue.attribute : undefined;

            const element = this.page.locator(selector);

            let value: string | null;
            if (attribute) {
              // Extract specified attribute
              value = await element.getAttribute(attribute);
            } else {
              // Extract text content (default)
              value = await element.textContent();
            }

            product.fields[fieldName] = value?.trim() || null;
          } catch (error) {
            const selector = typeof selectorValue === 'object' ? selectorValue.selector : selectorValue;
            logWarning(`Field ${fieldName} not found for ${url}`, { selector });
            product.fields[fieldName] = null;
          }
        }

        // Random delay
        const [min, max] = this.profile.delayRange;
        const delay = Math.floor(Math.random() * (max - min + 1)) + min;
        await this.page.waitForTimeout(delay);

        return product;
      } catch (error) {
        attempt++;
        logError(`Scrape attempt ${attempt} failed for ${url}`, error as Error);

        if (attempt >= maxRetries) {
          throw error;
        }

        // Exponential backoff
        const backoff = Math.pow(2, attempt) * 1000;
        await this.page?.waitForTimeout(backoff);
      }
    }

    return product;
  }

  async close(): Promise<void> {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
  }
}
