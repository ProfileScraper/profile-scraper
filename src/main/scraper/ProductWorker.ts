import { BrowserContext, Page } from 'patchright';
import { ProductData, SiteProfile } from '../../shared/types';
import { ActionExecutor } from './ActionExecutor';
import { logError, logInfo, logWarning } from '../logger';
import { ProductLogRepository, ProductLogCreate } from '../database/ProductLogRepository';

export class ProductWorker {
  private context: BrowserContext;
  private profile: SiteProfile;
  private actionExecutor: ActionExecutor;
  private page: Page | null = null;
  private logRepo?: ProductLogRepository;
  private currentProductId?: number;
  private pendingLogs: ProductLogCreate[] = [];

  constructor(context: BrowserContext, profile: SiteProfile, logRepo?: ProductLogRepository) {
    this.context = context;
    this.profile = profile;
    this.actionExecutor = new ActionExecutor();
    this.logRepo = logRepo;
  }

  /**
   * Set the current product ID for logging and flush buffered logs
   */
  setProductId(productId: number): void {
    this.currentProductId = productId;
    // Flush will now work because currentProductId is set
    this.flushLogs();
  }

  /**
   * Add a log entry for the current product (buffered until productId is set)
   */
  addLog(log: Omit<ProductLogCreate, 'productId'>): void {
    if (!this.logRepo) return;

    // Buffer the log without productId - it will be added when setProductId is called
    this.pendingLogs.push(log as ProductLogCreate);
  }

  /**
   * Flush pending logs to database
   */
  private flushLogs(): void {
    if (this.pendingLogs.length > 0 && this.logRepo && this.currentProductId) {
      // Add product ID to all pending logs
      const logsWithId = this.pendingLogs.map(log => ({
        ...log,
        productId: this.currentProductId!,
      }));
      this.logRepo.createBatch(logsWithId);
      this.pendingLogs = [];
    } else if (this.pendingLogs.length > 0 && !this.currentProductId) {
      // If we don't have a product ID yet, just clear the buffer
      // This can happen when scraping fails before product is saved
      this.pendingLogs = [];
    }
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

        // Navigate to product page with realistic timeout
        await this.page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });
        logInfo(`Navigated to ${url}`);
        this.addLog({
          logLevel: 'info',
          message: `Successfully navigated to product page`,
        });

        // Add small random delay after page load (simulate human reading time)
        const readDelay = 300 + Math.floor(Math.random() * 700); // 300-1000ms
        await this.page.waitForTimeout(readDelay);

        // Simulate realistic mouse movement
        try {
          await this.page.mouse.move(
            Math.floor(Math.random() * 800) + 100,
            Math.floor(Math.random() * 600) + 100,
            { steps: 10 }
          );
        } catch (err) {
          // Ignore mouse movement errors
        }

        // Execute product page actions
        if (this.profile.productPageActions.length > 0) {
          this.addLog({
            logLevel: 'info',
            message: `Executing ${this.profile.productPageActions.length} pre-scrape action(s)`,
          });
        }
        await this.actionExecutor.executeSequence(this.page, this.profile.productPageActions);

        // Extract fields
        for (const [fieldName, selectorValue] of Object.entries(this.profile.fieldSelectors)) {
          try {
            // Handle both string selector and FieldSelector object
            const isObject = typeof selectorValue === 'object' && selectorValue !== null;
            const selector = isObject ? selectorValue.selector : selectorValue;
            const attribute = isObject ? selectorValue.attribute : undefined;

            const element = this.page.locator(selector);

            // Check if element exists and get count
            const count = await element.count();

            if (count === 0) {
              // Enhanced error logging when selector finds nothing
              logWarning(`Field ${fieldName} selector found 0 elements for ${url}`, { selector });
              this.addLog({
                logLevel: 'warning',
                message: `Selector found 0 elements`,
                fieldName,
                selector,
                elementCount: 0,
              });

              // Try to provide helpful debugging context
              try {
                // If selector contains :has-text(), extract the text and search for it
                const hasTextMatch = selector.match(/:has-text\(['"](.+?)['"]\)/);
                if (hasTextMatch) {
                  const searchText = hasTextMatch[1];
                  const bodyText = await this.page.textContent('body');
                  const textFound = bodyText?.includes(searchText);

                  logInfo(`[Selector Debug] Searching for text "${searchText}" - ${textFound ? 'FOUND' : 'NOT FOUND'} in page body`);

                  if (!textFound) {
                    // Try case-insensitive search
                    const caseInsensitiveFound = bodyText?.toLowerCase().includes(searchText.toLowerCase());
                    if (caseInsensitiveFound) {
                      logInfo(`[Selector Debug] Text found with case-insensitive search - check capitalization`);
                    }
                  }

                  // Try base selector without :has-text()
                  const baseSelector = selector.split(':has-text')[0].trim();
                  if (baseSelector) {
                    const baseCount = await this.page.locator(baseSelector).count();
                    logInfo(`[Selector Debug] Base selector "${baseSelector}" found ${baseCount} elements`);

                    if (baseCount > 0) {
                      // Log text content of first few matching base elements
                      const sampleCount = Math.min(baseCount, 3);
                      for (let i = 0; i < sampleCount; i++) {
                        const sampleText = await this.page.locator(baseSelector).nth(i).textContent();
                        logInfo(`[Selector Debug] Element ${i + 1} text: "${sampleText?.trim().substring(0, 100)}"`);
                      }
                    }
                  }
                }

                // For :last-child selectors, check if parent exists
                if (selector.includes(':last-child')) {
                  const parentSelector = selector.replace(/:last-child.*$/, '').trim();
                  if (parentSelector) {
                    const parentCount = await this.page.locator(parentSelector).count();
                    logInfo(`[Selector Debug] Parent selector "${parentSelector}" found ${parentCount} elements`);
                  }
                }
              } catch (debugError) {
                // Don't fail the scrape if debug logging fails
                logInfo(`[Selector Debug] Could not gather additional context: ${(debugError as Error).message}`);
              }

              product.fields[fieldName] = null;
              continue;
            }

            // Handle strict mode violation - selector found multiple elements
            if (count > 1) {
              logWarning(`Field ${fieldName} selector found ${count} elements (strict mode violation) for ${url}`, { selector });
              logInfo(`[Selector Debug] Using first element. To fix: add .first() or make selector more specific`);
              logInfo(`[Selector Debug] Suggestions:
  1. Use .first() in selector (automatic fallback)
  2. Add more specific parent context
  3. Use unique attributes like data-* selectors
  4. Combine with :nth-child() or positional selectors`);

              this.addLog({
                logLevel: 'warning',
                message: `Selector found ${count} elements (using first)`,
                fieldName,
                selector,
                elementCount: count,
              });

              // Automatically use first element as fallback
              let value: string | null;
              if (attribute) {
                value = await element.first().getAttribute(attribute);
              } else {
                value = await element.first().textContent();
              }
              product.fields[fieldName] = value?.trim() || null;

              this.addLog({
                logLevel: 'info',
                message: `Successfully extracted field value: "${value?.trim()?.substring(0, 100)}"`,
                fieldName,
                selector,
                elementCount: count,
              });
              continue;
            }

            // Exactly 1 element found - extract normally
            let value: string | null;
            if (attribute) {
              // Extract specified attribute
              value = await element.getAttribute(attribute);
            } else {
              // Extract text content (default)
              value = await element.textContent();
            }

            product.fields[fieldName] = value?.trim() || null;

            this.addLog({
              logLevel: 'info',
              message: `Successfully extracted field value: "${value?.trim()?.substring(0, 100)}"`,
              fieldName,
              selector,
              elementCount: 1,
            });
          } catch (error) {
            const selector = typeof selectorValue === 'object' ? selectorValue.selector : selectorValue;
            logWarning(`Field ${fieldName} extraction failed for ${url}`, {
              selector,
              error: (error as Error).message
            });

            this.addLog({
              logLevel: 'error',
              message: `Field extraction failed`,
              fieldName,
              selector,
              errorMessage: (error as Error).message,
            });

            product.fields[fieldName] = null;
          }

          // Add tiny random delay between field extractions (50-150ms) to simulate reading
          const microDelay = 50 + Math.floor(Math.random() * 100);
          await this.page.waitForTimeout(microDelay);
        }

        // Don't flush logs here - they will be flushed after product is saved and setProductId is called

        // Random delay between products with slight variation
        const [min, max] = this.profile.delayRange;
        const baseDelay = Math.floor(Math.random() * (max - min + 1)) + min;
        // Add extra random variation (±20%)
        const variation = Math.floor(baseDelay * 0.2 * (Math.random() - 0.5));
        const finalDelay = Math.max(1000, baseDelay + variation); // Minimum 1 second
        await this.page.waitForTimeout(finalDelay);

        return product;
      } catch (error) {
        attempt++;
        logError(`Scrape attempt ${attempt} failed for ${url}`, error as Error);

        this.addLog({
          logLevel: 'error',
          message: `Scrape attempt ${attempt}/${maxRetries} failed`,
          errorMessage: (error as Error).message,
        });

        if (attempt >= maxRetries) {
          this.addLog({
            logLevel: 'error',
            message: `All ${maxRetries} retry attempts exhausted`,
            errorMessage: (error as Error).message,
          });
          // Don't flush here - logs will be discarded since we don't have a product ID
          // Failed scrapes don't get saved to the database
          throw error;
        }

        // Exponential backoff
        const backoff = Math.pow(2, attempt) * 1000;
        this.addLog({
          logLevel: 'info',
          message: `Retrying in ${backoff}ms (attempt ${attempt + 1}/${maxRetries})`,
        });
        await this.page?.waitForTimeout(backoff);
      }
    }

    return product;
  }

  async close(): Promise<void> {
    // Flush any remaining logs
    this.flushLogs();

    if (this.page) {
      await this.page.close();
      this.page = null;
    }
  }
}
