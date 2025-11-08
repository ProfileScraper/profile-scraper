import { autoUpdater } from 'electron-updater';
import { BrowserWindow } from 'electron';
import { logger } from '../logger';

export class AutoUpdaterService {
  private mainWindow: BrowserWindow | null = null;

  constructor() {
    // Configure auto-updater
    autoUpdater.autoDownload = false; // Don't auto-download, ask user first
    autoUpdater.autoInstallOnAppQuit = true; // Install when user quits

    // Set up event listeners
    this.setupListeners();
  }

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  private setupListeners() {
    autoUpdater.on('checking-for-update', () => {
      logger.info('[AutoUpdater] Checking for updates...');
    });

    autoUpdater.on('update-available', (info) => {
      logger.info('[AutoUpdater] Update available:', info.version);
      if (this.mainWindow) {
        this.mainWindow.webContents.send('updater:update-available', {
          version: info.version,
          releaseNotes: info.releaseNotes,
          releaseDate: info.releaseDate
        });
      }
    });

    autoUpdater.on('update-not-available', (info) => {
      logger.info('[AutoUpdater] Update not available. Current version:', info.version);
    });

    autoUpdater.on('error', (err) => {
      logger.error('[AutoUpdater] Error:', err);
      if (this.mainWindow) {
        this.mainWindow.webContents.send('updater:error', err.message);
      }
    });

    autoUpdater.on('download-progress', (progress) => {
      logger.info(`[AutoUpdater] Download progress: ${progress.percent}%`);
      if (this.mainWindow) {
        this.mainWindow.webContents.send('updater:download-progress', {
          percent: progress.percent,
          transferred: progress.transferred,
          total: progress.total
        });
      }
    });

    autoUpdater.on('update-downloaded', (info) => {
      logger.info('[AutoUpdater] Update downloaded:', info.version);
      if (this.mainWindow) {
        this.mainWindow.webContents.send('updater:update-downloaded', {
          version: info.version
        });
      }
    });
  }

  async checkForUpdates() {
    try {
      logger.info('[AutoUpdater] Manually checking for updates...');
      return await autoUpdater.checkForUpdates();
    } catch (error) {
      logger.error('[AutoUpdater] Check failed:', error);
      throw error;
    }
  }

  async downloadUpdate() {
    try {
      logger.info('[AutoUpdater] Starting download...');
      return await autoUpdater.downloadUpdate();
    } catch (error) {
      logger.error('[AutoUpdater] Download failed:', error);
      throw error;
    }
  }

  quitAndInstall() {
    logger.info('[AutoUpdater] Quitting and installing update...');
    autoUpdater.quitAndInstall(false, true);
  }
}
