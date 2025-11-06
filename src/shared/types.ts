export interface ScraperConfig {
  profiles: Record<string, SiteProfile>;
}

export interface SiteProfile {
  name: string;
  categoryUrl: string;
  preActions: Action[];
  pagination: PaginationConfig;
  productLinkSelector?: string;
  productPageActions: Action[];
  fieldSelectors: Record<string, string>;
  concurrency: number;
  delayRange: [number, number];
  retries: number;
  checkpointInterval: number;
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
