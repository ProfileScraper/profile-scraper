import { SiteProfile } from '../../shared/types';

export interface Job {
  id: string;
  profileId: string;
  startedAt: number;
  completedAt: number | null;
  status: 'running' | 'completed' | 'stopped' | 'failed';
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

export interface ElectronAPI {
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

  // Job operations
  getAllJobs: (filter?: { profileId?: string; status?: string }) => Promise<Job[]>;
  getJob: (id: string) => Promise<Job | null>;
  getJobErrors: (jobId: string) => Promise<JobError[]>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
