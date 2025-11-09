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

      // Use AppleScript to prompt for password and run sudo commands
      // Escape single quotes for osascript -e (outer shell layer)
      const script = `
        set appPath to "${bundlePath}"
        set tempCert to "${tempCert}"

        try
          -- Extract certificate (change to /tmp first so codesign0 is created there)
          do shell script "cd /tmp && codesign -d --extract-certificates " & quoted form of appPath & " 2>&1"

          -- Verify codesign0 was created
          do shell script "test -f /tmp/codesign0 || exit 1"

          -- Move to unique temp location
          do shell script "mv /tmp/codesign0 " & quoted form of tempCert

          -- Add to trusted certificates (requires admin password)
          do shell script "security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain " & quoted form of tempCert with administrator privileges

          -- Clean up
          do shell script "rm -f " & quoted form of tempCert

          return "success"
        on error errMsg
          -- Clean up on error if temp file exists
          try
            do shell script "rm -f " & quoted form of tempCert
          end try
          error errMsg
        end try
      `;

      const { stdout } = await execAsync(`osascript -e '${script.replace(/'/g, "\\'")}'`);

      if (stdout.trim() === 'success') {
        logger.info('[AppHandlers] Certificate trusted successfully');
        return { success: true };
      } else {
        logger.error('[AppHandlers] Script did not complete successfully:', stdout);
        return { success: false, error: 'Script did not complete successfully' };
      }
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
