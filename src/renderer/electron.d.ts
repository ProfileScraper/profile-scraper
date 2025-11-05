export interface ElectronAPI {
  loadConfig: () => Promise<any>;
  saveConfig: (config: any) => Promise<any>;
  startScrape: (profileName: string) => Promise<any>;
  pauseScrape: () => Promise<any>;
  resumeScrape: () => Promise<any>;
  stopScrape: () => Promise<any>;
  onProgress: (callback: (progress: any) => void) => void;
  onProduct: (callback: (product: any) => void) => void;
  onError: (callback: (error: any) => void) => void;
  onComplete: (callback: (stats: any) => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
