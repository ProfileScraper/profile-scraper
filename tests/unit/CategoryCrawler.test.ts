import { CategoryCrawler } from '../../src/main/scraper/CategoryCrawler';
import { SiteProfile } from '../../src/shared/types';

describe('CategoryCrawler', () => {
  let mockPage: any;
  let crawler: CategoryCrawler;
  let profile: SiteProfile;

  beforeEach(() => {
    mockPage = {
      goto: jest.fn(),
      locator: jest.fn(),
      click: jest.fn(),
      evaluate: jest.fn(),
    };

    profile = {
      name: 'test',
      categoryUrl: 'https://example.com/category',
      preActions: [],
      pagination: {
        type: 'button',
        selector: '.next',
        maxPages: 2,
      },
      productLinkSelector: '.product a',
      productPageActions: [],
      fieldSelectors: {},
      concurrency: 1,
      delayRange: [0, 0],
      retries: 1,
      checkpointInterval: 10,
    };

    crawler = new CategoryCrawler(mockPage, profile);
  });

  test('should extract product URLs from category page', async () => {
    const mockLinks = [
      { getAttribute: jest.fn().mockResolvedValue('https://example.com/product1') },
      { getAttribute: jest.fn().mockResolvedValue('https://example.com/product2') },
    ];

    mockPage.locator.mockReturnValue({
      all: jest.fn().mockResolvedValue(mockLinks),
    });

    const urls = await crawler.extractProductUrls();

    expect(urls).toEqual([
      'https://example.com/product1',
      'https://example.com/product2',
    ]);
  });

  test('should handle pagination', async () => {
    const mockLinks1 = [
      { getAttribute: jest.fn().mockResolvedValue('https://example.com/product1') },
    ];
    const mockLinks2 = [
      { getAttribute: jest.fn().mockResolvedValue('https://example.com/product3') },
    ];

    mockPage.locator
      .mockReturnValueOnce({ all: jest.fn().mockResolvedValue(mockLinks1) })
      .mockReturnValueOnce({ all: jest.fn().mockResolvedValue(mockLinks2) });

    mockPage.click.mockResolvedValue(undefined);

    const urls = await crawler.crawl();

    expect(urls.length).toBeGreaterThan(0);
    expect(mockPage.click).toHaveBeenCalled();
  });
});
