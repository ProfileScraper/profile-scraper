import { SiteProfile } from '../../shared/types';

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
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
