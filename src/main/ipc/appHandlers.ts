import { ipcMain, app, shell } from 'electron';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { UpdateChecker } from '../services/updateChecker';

const execAsync = promisify(exec);
const updateChecker = new UpdateChecker();

export function setupAppHandlers() {
  ipcMain.handle('app:get-version', async () => {
    return app.getVersion();
  });

  ipcMain.handle('app:check-for-updates', async () => {
    return await updateChecker.checkForUpdates();
  });

  ipcMain.handle('app:open-release-url', async (_event, url: string) => {
    await shell.openExternal(url);
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

        -- Extract certificate
        do shell script "codesign -d --extract-certificates " & quoted form of appPath & " 2>/dev/null; mv codesign0 " & quoted form of tempCert

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
