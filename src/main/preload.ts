import { contextBridge, ipcRenderer } from 'electron';

// Inline IPC channel constants to avoid module resolution issues in sandboxed preload
const IPC_CHANNELS = {
  SCRAPE_START: 'scrape:start',
  SCRAPE_PAUSE: 'scrape:pause',
  SCRAPE_RESUME: 'scrape:resume',
  SCRAPE_STOP: 'scrape:stop',
  CONFIG_LOAD: 'config:load',
  CONFIG_SAVE: 'config:save',
  EXPORT_CSV: 'export:csv',
  EXPORT_JSON: 'export:json',
  SCRAPE_PROGRESS: 'scrape:progress',
  SCRAPE_PRODUCT: 'scrape:product',
  SCRAPE_ERROR: 'scrape:error',
  SCRAPE_COMPLETE: 'scrape:complete',
  LOG_MESSAGE: 'log:message',
};

console.log('[Preload] Preload script starting...');

try {
  contextBridge.exposeInMainWorld('electronAPI', {
  // Config
  loadConfig: () => ipcRenderer.invoke(IPC_CHANNELS.CONFIG_LOAD),
  saveConfig: (config: any) => ipcRenderer.invoke(IPC_CHANNELS.CONFIG_SAVE, config),

  // Scraping controls
  startScrape: (profileName: string) => ipcRenderer.invoke(IPC_CHANNELS.SCRAPE_START, profileName),
  pauseScrape: () => ipcRenderer.invoke(IPC_CHANNELS.SCRAPE_PAUSE),
  resumeScrape: () => ipcRenderer.invoke(IPC_CHANNELS.SCRAPE_RESUME),
  stopScrape: () => ipcRenderer.invoke(IPC_CHANNELS.SCRAPE_STOP),

  // Event listeners
  onProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on(IPC_CHANNELS.SCRAPE_PROGRESS, (_, data) => callback(data));
  },
  onProduct: (callback: (product: any) => void) => {
    ipcRenderer.on(IPC_CHANNELS.SCRAPE_PRODUCT, (_, data) => callback(data));
  },
  onError: (callback: (error: any) => void) => {
    ipcRenderer.on(IPC_CHANNELS.SCRAPE_ERROR, (_, data) => callback(data));
  },
  onComplete: (callback: (stats: any) => void) => {
    ipcRenderer.on(IPC_CHANNELS.SCRAPE_COMPLETE, (_, data) => callback(data));
  },
});
  console.log('[Preload] electronAPI exposed successfully');
} catch (error) {
  console.error('[Preload] Error exposing electronAPI:', error);
}
