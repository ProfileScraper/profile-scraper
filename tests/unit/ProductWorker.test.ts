import { ProductWorker } from '../../src/main/scraper/ProductWorker';
import { SiteProfile } from '../../src/shared/types';

describe('ProductWorker', () => {
  let mockContext: any;
  let mockPage: any;
  let worker: ProductWorker;
  let profile: SiteProfile;

  beforeEach(() => {
    mockPage = {
      goto: jest.fn(),
      locator: jest.fn(() => ({
        textContent: jest.fn().mockResolvedValue('Test Value'),
        scrollIntoViewIfNeeded: jest.fn(),
      })),
      click: jest.fn(),
      waitForTimeout: jest.fn(),
      close: jest.fn(),
    };

    mockContext = {
      newPage: jest.fn().mockResolvedValue(mockPage),
    };

    profile = {
      name: 'test-profile',
      categoryUrl: 'https://example.com/category',
      preActions: [],
      pagination: { type: 'button', maxPages: 1 },
      productLinkSelector: '.product a',
      productPageActions: [],
      fieldSelectors: {
        Brand: '.brand',
        Model: '.model',
      },
      concurrency: 1,
      delayRange: [100, 200],
      retries: 3,
      checkpointInterval: 10,
    };

    worker = new ProductWorker(mockContext, profile);
  });

  test('should scrape product page', async () => {
    const url = 'https://example.com/product1';
    const product = await worker.scrape(url);

    expect(mockPage.goto).toHaveBeenCalledWith(url, { waitUntil: 'domcontentloaded' });
    expect(product.url).toBe(url);
    expect(product.fields.Brand).toBe('Test Value');
    expect(product.fields.Model).toBe('Test Value');
  });

  test('should handle missing fields as null', async () => {
    mockPage.locator.mockReturnValue({
      textContent: jest.fn().mockRejectedValue(new Error('Not found')),
    });

    const url = 'https://example.com/product1';
    const product = await worker.scrape(url);

    expect(product.fields.Brand).toBeNull();
    expect(product.fields.Model).toBeNull();
  });

  test('should apply random delay', async () => {
    const url = 'https://example.com/product1';
    await worker.scrape(url);

    expect(mockPage.waitForTimeout).toHaveBeenCalled();
    const delay = mockPage.waitForTimeout.mock.calls[0][0];
    expect(delay).toBeGreaterThanOrEqual(100);
    expect(delay).toBeLessThanOrEqual(200);
  });

  test('should retry on failure', async () => {
    mockPage.goto.mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(undefined);

    const url = 'https://example.com/product1';
    const product = await worker.scrape(url);

    expect(mockPage.goto).toHaveBeenCalledTimes(3);
    expect(product.url).toBe(url);
  });
});
