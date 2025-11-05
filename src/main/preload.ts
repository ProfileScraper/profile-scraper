import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/ipc-channels';

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
