import { SiteProfile, ProductData } from '../../shared/types';
import { ImportResult, ValidationResult } from '../../shared/validation-types';
import { SyncResult } from '../../shared/profileExplorer-types';

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

export type JobPhase =
  | 'initializing'
  | 'gathering_urls'
  | 'crawling_products'
  | 'finalizing'
  | null;

export interface Job {
  id: string;
  profileId: string;
  startedAt: number;
  completedAt: number | null;
  status: 'running' | 'completed' | 'stopped' | 'failed';
  phase: JobPhase;
  totalProducts: number | null;
  productsScraped: number | null;
  successCount: number | null;
  failCount: number | null;
  outputDir: string | null;
  checkpointPath: string | null;
  errorMessage: string | null;
}

export interface JobError {
  id: number;
  jobId: string;
  url: string;
  errorMessage: string;
  timestamp: number;
}

export interface JobQualityStats {
  totalProducts: number;
  totalFields: number;
  emptyFields: number;
  nullFields: number;
  productsWithEmptyFields: number;
  fieldStats: Array<{
    fieldName: string;
    emptyCount: number;
    nullCount: number;
    fillRate: number;
  }>;
}

export type LogLevel = 'info' | 'warning' | 'error' | 'debug';

export interface ProductLog {
  id: number;
  productId: number;
  timestamp: number;
  logLevel: LogLevel;
  message: string;
  context?: string;
  fieldName?: string;
  selector?: string;
  elementCount?: number;
  errorMessage?: string;
}

export interface JobLog extends ProductLog {
  productUrl: string;
}

export interface ElectronAPI {
  // App info
  getVersion: () => Promise<string>;

  // Existing methods
  startScrape: (profileName: string) => Promise<{ success: boolean }>;
  pauseScrape: () => Promise<{ success: boolean }>;
  resumeScrape: () => Promise<{ success: boolean }>;
  stopScrape: () => Promise<{ success: boolean }>;
  loadConfig: () => Promise<any>;
  saveConfig: (config: any) => Promise<{ success: boolean }>;
  onProgress: (callback: (progress: any) => void) => void;
  onProduct: (callback: (product: any) => void) => void;
  onError: (callback: (error: any) => void) => void;
  onComplete: (callback: (stats: any) => void) => void;

  // Profile operations
  createProfile: (profile: SiteProfile) => Promise<{ id: string }>;
  updateProfile: (id: string, profile: SiteProfile) => Promise<{ success: boolean }>;
  deleteProfile: (id: string) => Promise<{ success: boolean }>;
  getProfile: (id: string) => Promise<SiteProfile | null>;
  getAllProfiles: () => Promise<SiteProfile[]>;
  exportProfile: (profileId: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  importProfileFromFile: () => Promise<ImportResult>;
  importProfileFromURL: (url: string) => Promise<ImportResult>;
  validateProfileJSON: (json: string) => Promise<ValidationResult>;
  cloneProfile: (sourceId: string) => Promise<{ success: boolean; profileId?: string; error?: string }>;

  // Profile Explorer operations
  syncProfileExplorer: () => Promise<SyncResult>;
  getPublicProfiles: () => Promise<SiteProfile[]>;

  // GitHub authentication
  githubAuthStart: () => Promise<{ success: boolean; user?: { login: string; name: string | null; avatar_url: string }; error?: string }>;
  githubAuthStatus: () => Promise<{ authenticated: boolean; user?: { login: string; name: string | null; avatar_url: string } | null }>;
  githubAuthLogout: () => Promise<{ success: boolean; error?: string }>;
  githubAuthGetUser: () => Promise<{ login: string; name: string | null; avatar_url: string } | null>;

  // GitHub publishing
  githubPublishProfile: (data: { profile: SiteProfile; description: string; tags: string[] }) => Promise<{ success: boolean; prUrl?: string; error?: string }>;

  // Job operations
  getAllJobs: (filter?: { profileId?: string; status?: string }) => Promise<Job[]>;
  getJob: (id: string) => Promise<Job | null>;
  getJobErrors: (jobId: string) => Promise<JobError[]>;
  getJobData: (jobId: string) => Promise<ProductData[]>;
  exportJobData: (jobId: string, format: 'json' | 'csv' | 'both') => Promise<{ success: boolean; path?: string; message?: string }>;
  deleteJob: (jobId: string) => Promise<{ success: boolean }>;
  deleteEmptyJobs: () => Promise<{ success: boolean; deleted: number }>;
  getJobQualityStats: (jobId: string) => Promise<JobQualityStats>;

  // Product logs
  getProductLogs: (productId: number) => Promise<ProductLog[]>;
  getJobLogs: (jobId: string) => Promise<JobLog[]>;

  // Testing
  testProfile: (profile: SiteProfile) => Promise<ProfileTestResult>;

  // Inspector
  openInspector: (url: string, selectorType: string) => Promise<void>;
  closeInspector: () => Promise<void>;
  onInspectorSelect: (callback: (selector: string) => void) => (() => void) | void;

  // App updates
  checkForUpdates: () => Promise<UpdateInfo>;
  openReleaseUrl: (url: string) => Promise<void>;
  trustCertificate: () => Promise<{ success: boolean; error?: string }>;
}

export interface UpdateInfo {
  available: boolean;
  currentVersion: string;
  latestVersion?: string;
  releaseUrl?: string;
  releaseNotes?: string;
  publishedAt?: string;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
