import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import { BrowserDownloadService } from '../services/BrowserDownloadService';

const browserService = new BrowserDownloadService();

export function setupBrowserHandlers(): void {
  /**
   * Check if browsers are installed
   */
  ipcMain.handle(IPC_CHANNELS.BROWSER_CHECK_INSTALLED, async (event: IpcMainInvokeEvent) => {
    try {
      console.log('[IPC] Checking if browsers are installed...');
      const installed = browserService.areBrowsersInstalled();
      const info = browserService.getBrowserInfo();
      console.log('[IPC] Browsers installed:', installed);
      console.log('[IPC] Browser info:', info);
      return { installed, info };
    } catch (error) {
      console.error('[IPC] Error checking browser installation:', error);
      return {
        installed: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });

  /**
   * Download and install browsers
   */
  ipcMain.handle(IPC_CHANNELS.BROWSER_DOWNLOAD, async (event: IpcMainInvokeEvent) => {
    try {
      console.log('[IPC] Starting browser download...');

      await browserService.downloadBrowsers((message: string) => {
        // Send progress updates to renderer
        event.sender.send(IPC_CHANNELS.BROWSER_DOWNLOAD_PROGRESS, message);
      });

      console.log('[IPC] Browser download complete');
      return { success: true };
    } catch (error) {
      console.error('[IPC] Browser download failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });

  /**
   * Get browser info for debugging
   */
  ipcMain.handle(IPC_CHANNELS.BROWSER_GET_INFO, async (event: IpcMainInvokeEvent) => {
    try {
      const info = browserService.getBrowserInfo();
      return info;
    } catch (error) {
      console.error('[IPC] Error getting browser info:', error);
      return {
        error: error instanceof Error ? error.message : String(error)
      };
    }
  });
}
