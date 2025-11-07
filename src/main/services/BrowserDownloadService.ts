import { app } from 'electron';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { logInfo, logError } from '../logger';

export class BrowserDownloadService {
  private browsersPath: string;

  constructor() {
    // Store browsers in userData directory
    this.browsersPath = path.join(app.getPath('userData'), 'browsers');
  }

  /**
   * Get the path where browsers should be stored
   */
  getBrowsersPath(): string {
    return this.browsersPath;
  }

  /**
   * Check if browsers are already installed
   */
  areBrowsersInstalled(): boolean {
    const chromiumPath = path.join(
      this.browsersPath,
      'chromium_headless_shell-1194',
      'chrome-mac',
      'headless_shell'
    );

    const exists = fs.existsSync(chromiumPath);
    logInfo(`[BrowserDownload] Checking for browser at: ${chromiumPath}`);
    logInfo(`[BrowserDownload] Browsers installed: ${exists}`);

    if (exists) {
      // Verify it's executable
      try {
        const stats = fs.statSync(chromiumPath);
        const isExecutable = (stats.mode & 0o111) !== 0;
        logInfo(`[BrowserDownload] Browser is executable: ${isExecutable}`);
        return isExecutable;
      } catch (error) {
        logError('[BrowserDownload] Error checking browser executable', error as Error);
        return false;
      }
    }

    return false;
  }

  /**
   * Download and install browsers
   */
  async downloadBrowsers(onProgress?: (message: string) => void): Promise<void> {
    logInfo('[BrowserDownload] Starting browser download...');
    logInfo(`[BrowserDownload] Platform: ${process.platform}`);
    logInfo(`[BrowserDownload] Architecture: ${process.arch}`);
    logInfo(`[BrowserDownload] Target path: ${this.browsersPath}`);

    const notify = (msg: string) => {
      logInfo(`[BrowserDownload] ${msg}`);
      if (onProgress) onProgress(msg);
    };

    try {
      // Ensure browsers directory exists
      if (!fs.existsSync(this.browsersPath)) {
        fs.mkdirSync(this.browsersPath, { recursive: true });
        notify('Created browsers directory');
      }

      // Set PLAYWRIGHT_BROWSERS_PATH to our custom location
      process.env.PLAYWRIGHT_BROWSERS_PATH = this.browsersPath;
      notify('Set browsers path');

      // Run patchright install chromium
      notify('Downloading Chromium browser...');
      notify('This may take a few minutes...');

      const npxPath = path.join(process.cwd(), 'node_modules', '.bin', 'patchright');
      const command = app.isPackaged
        ? `"${npxPath}" install chromium`
        : 'npx patchright install chromium';

      logInfo(`[BrowserDownload] Running command: ${command}`);
      logInfo(`[BrowserDownload] CWD: ${process.cwd()}`);

      try {
        execSync(command, {
          stdio: 'pipe',
          env: {
            ...process.env,
            PLAYWRIGHT_BROWSERS_PATH: this.browsersPath,
          },
        });
      } catch (execError: any) {
        logError('[BrowserDownload] execSync error', execError);

        // Check if browser was actually downloaded despite the error
        if (this.areBrowsersInstalled()) {
          notify('Browsers downloaded successfully (ignored non-critical error)');
          return;
        }

        throw execError;
      }

      notify('Verifying installation...');

      // Verify installation
      if (!this.areBrowsersInstalled()) {
        throw new Error('Browser installation verification failed');
      }

      notify('Browsers installed successfully!');
      logInfo('[BrowserDownload] Download complete');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logError('[BrowserDownload] Download failed', error as Error);
      throw new Error(`Failed to download browsers: ${errorMsg}`);
    }
  }

  /**
   * Get detailed browser info for debugging
   */
  getBrowserInfo(): object {
    const chromiumPath = path.join(
      this.browsersPath,
      'chromium_headless_shell-1194',
      'chrome-mac',
      'headless_shell'
    );

    const info: any = {
      browsersPath: this.browsersPath,
      chromiumPath,
      exists: fs.existsSync(chromiumPath),
      platform: process.platform,
      arch: process.arch,
    };

    if (info.exists) {
      try {
        const stats = fs.statSync(chromiumPath);
        info.size = stats.size;
        info.mode = stats.mode.toString(8);
        info.isExecutable = (stats.mode & 0o111) !== 0;
      } catch (error) {
        info.error = error instanceof Error ? error.message : String(error);
      }
    }

    return info;
  }
}
