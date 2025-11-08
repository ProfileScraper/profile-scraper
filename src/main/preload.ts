import { contextBridge, ipcRenderer } from 'electron';
import type { SiteProfile } from '../shared/types';

// Inline IPC channel constants to avoid module resolution issues in sandboxed preload
const IPC_CHANNELS = {
  APP_GET_VERSION: 'app:get-version',
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
  PROFILE_TOGGLE_IN_LIBRARY: 'profile:toggle-in-library',
  PROFILE_EXPLORER_SYNC: 'profileExplorer:sync',
  PROFILE_EXPLORER_GET_ALL: 'profileExplorer:get-all',
  GITHUB_AUTH_START: 'github:auth:start',
  GITHUB_AUTH_STATUS: 'github:auth:status',
  GITHUB_AUTH_LOGOUT: 'github:auth:logout',
  GITHUB_AUTH_GET_USER: 'github:auth:get-user',
  GITHUB_PUBLISH_PROFILE: 'github:publish:profile',
  JOB_GET_ALL: 'job:get-all',
  JOB_GET: 'job:get',
  JOB_GET_ERRORS: 'job:get-errors',
  JOB_GET_DATA: 'job:get-data',
  JOB_EXPORT_DATA: 'job:export-data',
  JOB_DELETE: 'job:delete',
  JOB_DELETE_EMPTY: 'job:delete-empty',
  JOB_GET_QUALITY_STATS: 'job:get-quality-stats',
  JOB_GET_SCREENSHOT: 'job:get-screenshot',
  LOGS_GET_BY_PRODUCT_ID: 'logs:get-by-product-id',
  LOGS_GET_BY_JOB_ID: 'logs:get-by-job-id',
  PROFILE_TEST: 'profile:test',
  INSPECTOR_OPEN: 'inspector:open',
  INSPECTOR_CLOSE: 'inspector:close',
  INSPECTOR_SELECT: 'inspector:select',
  APP_CHECK_FOR_UPDATES: 'app:check-for-updates',
  APP_OPEN_RELEASE_URL: 'app:open-release-url',
  APP_TRUST_CERTIFICATE: 'app:trust-certificate',
  APP_DOWNLOAD_UPDATE: 'app:download-update',
  APP_QUIT_AND_INSTALL: 'app:quit-and-install',
  UPDATER_UPDATE_AVAILABLE: 'updater:update-available',
  UPDATER_DOWNLOAD_PROGRESS: 'updater:download-progress',
  UPDATER_UPDATE_DOWNLOADED: 'updater:update-downloaded',
  UPDATER_ERROR: 'updater:error',
};

console.log('[Preload] Preload script starting...');

try {
  contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getVersion: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_VERSION),

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
  toggleProfileInLibrary: (profileId: string, inLibrary: boolean) => ipcRenderer.invoke(IPC_CHANNELS.PROFILE_TOGGLE_IN_LIBRARY, profileId, inLibrary),

  // Profile Explorer operations
  syncProfileExplorer: () => ipcRenderer.invoke(IPC_CHANNELS.PROFILE_EXPLORER_SYNC),
  getPublicProfiles: () => ipcRenderer.invoke(IPC_CHANNELS.PROFILE_EXPLORER_GET_ALL),

  // GitHub authentication
  githubAuthStart: () => ipcRenderer.invoke(IPC_CHANNELS.GITHUB_AUTH_START),
  githubAuthStatus: () => ipcRenderer.invoke(IPC_CHANNELS.GITHUB_AUTH_STATUS),
  githubAuthLogout: () => ipcRenderer.invoke(IPC_CHANNELS.GITHUB_AUTH_LOGOUT),
  githubAuthGetUser: () => ipcRenderer.invoke(IPC_CHANNELS.GITHUB_AUTH_GET_USER),

  // GitHub publishing
  githubPublishProfile: (data: any) => ipcRenderer.invoke(IPC_CHANNELS.GITHUB_PUBLISH_PROFILE, data),

  // Job operations
  getAllJobs: (filter?: { profileId?: string; status?: string }) => ipcRenderer.invoke(IPC_CHANNELS.JOB_GET_ALL, filter),
  getJob: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.JOB_GET, id),
  getJobErrors: (jobId: string) => ipcRenderer.invoke(IPC_CHANNELS.JOB_GET_ERRORS, jobId),
  getJobData: (jobId: string) => ipcRenderer.invoke(IPC_CHANNELS.JOB_GET_DATA, jobId),
  exportJobData: (jobId: string, format: 'json' | 'csv' | 'both') => ipcRenderer.invoke(IPC_CHANNELS.JOB_EXPORT_DATA, jobId, format),
  deleteJob: (jobId: string) => ipcRenderer.invoke(IPC_CHANNELS.JOB_DELETE, jobId),
  deleteEmptyJobs: () => ipcRenderer.invoke(IPC_CHANNELS.JOB_DELETE_EMPTY),
  getJobQualityStats: (jobId: string) => ipcRenderer.invoke(IPC_CHANNELS.JOB_GET_QUALITY_STATS, jobId),
  getJobScreenshot: (screenshotPath: string) => ipcRenderer.invoke(IPC_CHANNELS.JOB_GET_SCREENSHOT, screenshotPath),

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

  // App updates
  checkForUpdates: () => ipcRenderer.invoke(IPC_CHANNELS.APP_CHECK_FOR_UPDATES),
  downloadUpdate: () => ipcRenderer.invoke(IPC_CHANNELS.APP_DOWNLOAD_UPDATE),
  quitAndInstall: () => ipcRenderer.invoke(IPC_CHANNELS.APP_QUIT_AND_INSTALL),
  openReleaseUrl: (url: string) => ipcRenderer.invoke(IPC_CHANNELS.APP_OPEN_RELEASE_URL, url),
  trustCertificate: () => ipcRenderer.invoke(IPC_CHANNELS.APP_TRUST_CERTIFICATE),

  // Update event listeners
  onUpdateAvailable: (callback: (info: any) => void) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on(IPC_CHANNELS.UPDATER_UPDATE_AVAILABLE, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.UPDATER_UPDATE_AVAILABLE, handler);
  },
  onDownloadProgress: (callback: (progress: any) => void) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on(IPC_CHANNELS.UPDATER_DOWNLOAD_PROGRESS, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.UPDATER_DOWNLOAD_PROGRESS, handler);
  },
  onUpdateDownloaded: (callback: (info: any) => void) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on(IPC_CHANNELS.UPDATER_UPDATE_DOWNLOADED, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.UPDATER_UPDATE_DOWNLOADED, handler);
  },
  onUpdateError: (callback: (error: string) => void) => {
    const handler = (_: any, data: string) => callback(data);
    ipcRenderer.on(IPC_CHANNELS.UPDATER_ERROR, handler);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.UPDATER_ERROR, handler);
  },
});
  console.log('[Preload] electronAPI exposed successfully');
} catch (error) {
  console.error('[Preload] Error exposing electronAPI:', error);
}
