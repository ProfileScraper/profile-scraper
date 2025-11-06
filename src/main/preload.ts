import { contextBridge, ipcRenderer } from 'electron';
import type { SiteProfile } from '../shared/types';

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
  PROFILE_CREATE: 'profile:create',
  PROFILE_UPDATE: 'profile:update',
  PROFILE_DELETE: 'profile:delete',
  PROFILE_GET: 'profile:get',
  PROFILE_GET_ALL: 'profile:get-all',
  JOB_GET_ALL: 'job:get-all',
  JOB_GET: 'job:get',
  JOB_GET_ERRORS: 'job:get-errors',
  JOB_GET_DATA: 'job:get-data',
  JOB_EXPORT_DATA: 'job:export-data',
};

console.log('[Preload] Preload script starting...');

try {
  contextBridge.exposeInMainWorld('electronAPI', {
  // Config
  loadConfig: () => ipcRenderer.invoke(IPC_CHANNELS.CONFIG_LOAD),
  saveConfig: (config: any) => ipcRenderer.invoke(IPC_CHANNELS.CONFIG_SAVE, config),

  // Scraping controls
  startScrape: (profileId: string) => ipcRenderer.invoke(IPC_CHANNELS.SCRAPE_START, profileId),
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

  // Profile operations
  createProfile: (profile: SiteProfile) => ipcRenderer.invoke(IPC_CHANNELS.PROFILE_CREATE, profile),
  updateProfile: (id: string, profile: SiteProfile) => ipcRenderer.invoke(IPC_CHANNELS.PROFILE_UPDATE, id, profile),
  deleteProfile: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.PROFILE_DELETE, id),
  getProfile: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.PROFILE_GET, id),
  getAllProfiles: () => ipcRenderer.invoke(IPC_CHANNELS.PROFILE_GET_ALL),

  // Job operations
  getAllJobs: (filter?: { profileId?: string; status?: string }) => ipcRenderer.invoke(IPC_CHANNELS.JOB_GET_ALL, filter),
  getJob: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.JOB_GET, id),
  getJobErrors: (jobId: string) => ipcRenderer.invoke(IPC_CHANNELS.JOB_GET_ERRORS, jobId),
  getJobData: (jobId: string) => ipcRenderer.invoke(IPC_CHANNELS.JOB_GET_DATA, jobId),
  exportJobData: (jobId: string, format: 'json' | 'csv' | 'both') => ipcRenderer.invoke(IPC_CHANNELS.JOB_EXPORT_DATA, jobId, format),
});
  console.log('[Preload] electronAPI exposed successfully');
} catch (error) {
  console.error('[Preload] Error exposing electronAPI:', error);
}
