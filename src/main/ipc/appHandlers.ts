import { ipcMain, app, shell } from 'electron';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getAutoUpdaterService } from '../main';
import { logger } from '../logger';

const execAsync = promisify(exec);

export function setupAppHandlers() {
  ipcMain.handle('app:get-version', async () => {
    return app.getVersion();
  });

  ipcMain.handle('app:check-for-updates', async () => {
    const service = getAutoUpdaterService();
    if (!service) {
      logger.warn('[AppHandlers] Auto-updater not available (development mode)');
      throw new Error('Auto-updater is only available in production builds');
    }
    try {
      return await service.checkForUpdates();
    } catch (error) {
      logger.error('[AppHandlers] Check for updates failed:', error);
      throw error;
    }
  });

  ipcMain.handle('app:download-update', async () => {
    const service = getAutoUpdaterService();
    if (!service) {
      logger.warn('[AppHandlers] Auto-updater not available (development mode)');
      throw new Error('Auto-updater is only available in production builds');
    }
    try {
      return await service.downloadUpdate();
    } catch (error) {
      logger.error('[AppHandlers] Download update failed:', error);
      throw error;
    }
  });

  ipcMain.handle('app:quit-and-install', async () => {
    const service = getAutoUpdaterService();
    if (!service) {
      logger.warn('[AppHandlers] Auto-updater not available (development mode)');
      throw new Error('Auto-updater is only available in production builds');
    }
    try {
      service.quitAndInstall();
    } catch (error) {
      logger.error('[AppHandlers] Quit and install failed:', error);
      throw error;
    }
  });

  ipcMain.handle('app:trust-certificate', async () => {
    try {
      const appPath = app.getPath('exe');
      // Get the .app bundle path (removes /Contents/MacOS/ProfileScraper)
      const bundlePath = appPath.replace(/\/Contents\/MacOS\/.*$/, '');

      // Extract certificate
      const tempCert = '/tmp/profilescraper-cert.cer';

      // Use AppleScript to prompt for password and run sudo commands
      const script = `
        set appPath to "${bundlePath}"
        set tempCert to "${tempCert}"

        -- Extract certificate (change to /tmp first so codesign0 is created there)
        do shell script "cd /tmp && codesign -d --extract-certificates " & quoted form of appPath & " 2>/dev/null && mv /tmp/codesign0 " & quoted form of tempCert

        -- Add to trusted certificates (requires admin password)
        do shell script "security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain " & quoted form of tempCert with administrator privileges

        -- Clean up
        do shell script "rm -f " & quoted form of tempCert

        return "success"
      `;

      const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "\\'")}'`);

      if (stdout.trim() === 'success') {
        return { success: true };
      } else {
        return { success: false, error: 'Script did not complete successfully' };
      }
    } catch (error: any) {
      console.error('[AppHandlers] Failed to trust certificate:', error);

      // Check if user cancelled
      if (error.message && error.message.includes('User canceled')) {
        return { success: false, error: 'User cancelled' };
      }

      return { success: false, error: error.message || 'Unknown error' };
    }
  });
}
