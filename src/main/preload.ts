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
  PROFILE_EXPORT: 'profile:export',
  PROFILE_IMPORT_FILE: 'profile:import-file',
  PROFILE_IMPORT_URL: 'profile:import-url',
  PROFILE_VALIDATE_JSON: 'profile:validate-json',
  PROFILE_CLONE: 'profile:clone',
  JOB_GET_ALL: 'job:get-all',
  JOB_GET: 'job:get',
  JOB_GET_ERRORS: 'job:get-errors',
  JOB_GET_DATA: 'job:get-data',
  JOB_EXPORT_DATA: 'job:export-data',
  JOB_DELETE: 'job:delete',
  JOB_DELETE_EMPTY: 'job:delete-empty',
  JOB_GET_QUALITY_STATS: 'job:get-quality-stats',
  LOGS_GET_BY_PRODUCT_ID: 'logs:get-by-product-id',
  LOGS_GET_BY_JOB_ID: 'logs:get-by-job-id',
  PROFILE_TEST: 'profile:test',
  INSPECTOR_OPEN: 'inspector:open',
  INSPECTOR_CLOSE: 'inspector:close',
  INSPECTOR_SELECT: 'inspector:select',
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
  exportProfile: (profileId: string) => ipcRenderer.invoke(IPC_CHANNELS.PROFILE_EXPORT, profileId),
  importProfileFromFile: () => ipcRenderer.invoke(IPC_CHANNELS.PROFILE_IMPORT_FILE),
  importProfileFromURL: (url: string) => ipcRenderer.invoke(IPC_CHANNELS.PROFILE_IMPORT_URL, url),
  validateProfileJSON: (json: string) => ipcRenderer.invoke(IPC_CHANNELS.PROFILE_VALIDATE_JSON, json),
  cloneProfile: (sourceId: string) => ipcRenderer.invoke(IPC_CHANNELS.PROFILE_CLONE, sourceId),

  // Job operations
  getAllJobs: (filter?: { profileId?: string; status?: string }) => ipcRenderer.invoke(IPC_CHANNELS.JOB_GET_ALL, filter),
  getJob: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.JOB_GET, id),
  getJobErrors: (jobId: string) => ipcRenderer.invoke(IPC_CHANNELS.JOB_GET_ERRORS, jobId),
  getJobData: (jobId: string) => ipcRenderer.invoke(IPC_CHANNELS.JOB_GET_DATA, jobId),
  exportJobData: (jobId: string, format: 'json' | 'csv' | 'both') => ipcRenderer.invoke(IPC_CHANNELS.JOB_EXPORT_DATA, jobId, format),
  deleteJob: (jobId: string) => ipcRenderer.invoke(IPC_CHANNELS.JOB_DELETE, jobId),
  deleteEmptyJobs: () => ipcRenderer.invoke(IPC_CHANNELS.JOB_DELETE_EMPTY),
  getJobQualityStats: (jobId: string) => ipcRenderer.invoke(IPC_CHANNELS.JOB_GET_QUALITY_STATS, jobId),

  // Product logs
  getProductLogs: (productId: number) => ipcRenderer.invoke(IPC_CHANNELS.LOGS_GET_BY_PRODUCT_ID, productId),
  getJobLogs: (jobId: string) => ipcRenderer.invoke(IPC_CHANNELS.LOGS_GET_BY_JOB_ID, jobId),

  // Testing
  testProfile: (profile: SiteProfile) => ipcRenderer.invoke(IPC_CHANNELS.PROFILE_TEST, profile),

  // Inspector
  openInspector: (url: string, selectorType: string) => ipcRenderer.invoke(IPC_CHANNELS.INSPECTOR_OPEN, url, selectorType),
  closeInspector: () => ipcRenderer.invoke(IPC_CHANNELS.INSPECTOR_CLOSE),
  onInspectorSelect: (callback: (selector: string) => void) => {
    const handler = (_: any, selector: string) => {
      console.log('[Preload] Received selector from inspector:', selector);
      callback(selector);
    };
    ipcRenderer.on(IPC_CHANNELS.INSPECTOR_SELECT, handler);
    // Return cleanup function
    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.INSPECTOR_SELECT, handler);
    };
  },
});
  console.log('[Preload] electronAPI exposed successfully');
} catch (error) {
  console.error('[Preload] Error exposing electronAPI:', error);
}
