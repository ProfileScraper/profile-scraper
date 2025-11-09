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
    // Platform check - only available on macOS
    if (process.platform !== 'darwin') {
      logger.warn('[AppHandlers] Certificate trust attempted on non-macOS platform');
      return { success: false, error: 'This feature is only available on macOS' };
    }

    try {
      const appPath = app.getPath('exe');
      // Get the .app bundle path (removes /Contents/MacOS/ProfileScraper)
      const bundlePath = appPath.replace(/\/Contents\/MacOS\/.*$/, '');

      // Validate bundle path
      if (!bundlePath.endsWith('.app')) {
        logger.error('[AppHandlers] Invalid bundle path:', bundlePath);
        return { success: false, error: 'Invalid application bundle path' };
      }

      // Validate no shell metacharacters in path
      if (bundlePath.includes('"') || bundlePath.includes('`') || bundlePath.includes('$')) {
        logger.error('[AppHandlers] Bundle path contains invalid characters:', bundlePath);
        return { success: false, error: 'Invalid characters in application path' };
      }

      // Generate unique temp filename to prevent race conditions
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const tempCert = `/tmp/profilescraper-cert-${timestamp}-${random}.cer`;

      logger.info('[AppHandlers] Extracting certificate from:', bundlePath);

      // Extract certificate first (without admin privileges)
      logger.info('[AppHandlers] Running certificate extraction...');
      await execAsync(`cd /tmp && codesign -d --extract-certificates "${bundlePath}" 2>&1`);

      // Verify extraction succeeded
      await execAsync('test -f /tmp/codesign0');

      // Move to unique temp location
      await execAsync(`mv /tmp/codesign0 "${tempCert}"`);

      logger.info('[AppHandlers] Certificate extracted to:', tempCert);

      // Now use AppleScript ONLY for the privileged operation
      // The 'with administrator privileges' clause must NOT be inside a try block
      const script = `do shell script "security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain '${tempCert}'" with administrator privileges`;

      try {
        await execAsync(`osascript -e '${script.replace(/'/g, "\\'")}'`);
        logger.info('[AppHandlers] Certificate trusted successfully');
      } finally {
        // Always cleanup temp file
        try {
          await execAsync(`rm -f "${tempCert}"`);
        } catch (cleanupError) {
          logger.warn('[AppHandlers] Failed to cleanup temp file:', cleanupError);
        }
      }

      return { success: true };
    } catch (error: any) {
      logger.error('[AppHandlers] Failed to trust certificate:', {
        error: error.message,
        stack: error.stack
      });

      // Check if user cancelled
      if (error.message && error.message.includes('User canceled')) {
        return { success: false, error: 'User cancelled' };
      }

      return { success: false, error: error.message || 'Unknown error' };
    }
  });
}
