export interface ScraperConfig {
  profiles: Record<string, SiteProfile>;
}

export interface FieldSelector {
  selector: string;
  attribute?: string; // undefined = textContent, 'href', 'src', etc.
}

export interface SiteProfile {
  name: string;
  categoryUrl: string;
  preActions: Action[];
  pagination: PaginationConfig;
  productLinkSelector?: string;
  prependDomain?: boolean;
  productPageActions: Action[];
  fieldSelectors: Record<string, string | FieldSelector>;
  concurrency: number;
  delayRange: [number, number];
  retries: number;
  checkpointInterval: number;
  headless?: boolean; // Default true - headless mode for faster scraping
  overwriteExisting?: boolean; // Default false - if true, re-scraping a URL will overwrite the existing data
}

export interface PaginationConfig {
  type: 'button' | 'infinite' | 'url';
  selector?: string;
  maxPages: number;
}

export interface Action {
  type: 'clickElement' | 'sleep' | 'scrollTo' | 'waitForSelector' | 'type';
  selector?: string;
  duration?: number;
  timeout?: number;
  text?: string;
  optional?: boolean;
}

export interface ProductData {
  url: string;
  scrapedAt: string;
  fields: Record<string, string | null>;
}

export interface CheckpointData {
  timestamp: string;
  profileName: string;
  completed: string[];
  pending: string[];
  totalProducts: number;
  successCount: number;
  failCount: number;
}

export interface ScrapeProgress {
  productsScraped: number;
  totalProducts: number;
  successCount: number;
  failCount: number;
  currentUrls: string[];
  eta: number | null;
}

export interface ScrapeStatus {
  isRunning: boolean;
  isPaused: boolean;
  progress: ScrapeProgress;
}
