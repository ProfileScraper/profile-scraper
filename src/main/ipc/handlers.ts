import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import { ScrapeOrchestrator } from '../scraper/ScrapeOrchestrator';
import { ScraperConfig, SiteProfile } from '../../shared/types';
import { validateConfig } from '../../shared/config-schema';
import { getDatabase } from '../database/db';
import { ProfileRepository } from '../database/ProfileRepository';
import { JobRepository } from '../database/JobRepository';
import * as fs from 'fs';
import * as path from 'path';

let orchestrator: ScrapeOrchestrator | null = null;
let currentJobId: string | null = null;

export function setupIpcHandlers(mainWindow: Electron.BrowserWindow): void {
  // Load config
  ipcMain.handle(IPC_CHANNELS.CONFIG_LOAD, async () => {
    const configPath = path.join(process.cwd(), 'configs', 'scraper-config.json');

    if (!fs.existsSync(configPath)) {
      return null;
    }

    const data = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(data);

    if (!validateConfig(config)) {
      throw new Error('Invalid config format');
    }

    return config;
  });

  // Save config
  ipcMain.handle(IPC_CHANNELS.CONFIG_SAVE, async (event: IpcMainInvokeEvent, config: ScraperConfig) => {
    if (!validateConfig(config)) {
      throw new Error('Invalid config format');
    }

    const configPath = path.join(process.cwd(), 'configs', 'scraper-config.json');
    const dir = path.dirname(configPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return { success: true };
  });

  // Start scraping
  ipcMain.handle(IPC_CHANNELS.SCRAPE_START, async (event: IpcMainInvokeEvent, profileId: string) => {
    console.log('[Main Process] SCRAPE_START handler called with profile ID:', profileId);

    try {
      // Get database and repositories
      const db = getDatabase();
      const profileRepo = new ProfileRepository(db);
      const jobRepo = new JobRepository(db);

      // Load profile from database
      const profileData = profileRepo.getById(profileId);
      if (!profileData) {
        throw new Error(`Profile not found: ${profileId}`);
      }
      console.log('[Main Process] Profile loaded:', profileData.name);

      // Convert to SiteProfile format (remove id, createdAt, updatedAt)
      const profile: SiteProfile = {
        name: profileData.name,
        categoryUrl: profileData.categoryUrl,
        preActions: profileData.preActions,
        pagination: profileData.pagination,
        productLinkSelector: profileData.productLinkSelector,
        prependDomain: profileData.prependDomain,
        productPageActions: profileData.productPageActions,
        fieldSelectors: profileData.fieldSelectors,
        concurrency: profileData.concurrency,
        delayRange: profileData.delayRange,
        retries: profileData.retries,
        checkpointInterval: profileData.checkpointInterval,
        headless: profileData.headless,
        overwriteExisting: profileData.overwriteExisting,
      };

      // Create job record first to get the job ID
      currentJobId = jobRepo.create({
        profileId,
      });
      console.log('[Main Process] Job created:', currentJobId);

      // Setup job-specific output directory and checkpoint
      const outputDir = path.join(process.cwd(), 'output', profileId, currentJobId);
      const checkpointPath = path.join(outputDir, 'progress.json');

      // Ensure output directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Update job with output paths
      jobRepo.updatePaths(currentJobId, outputDir, checkpointPath);
      console.log('[Main Process] Output directory:', outputDir);

      // Create orchestrator with database connection
      orchestrator = new ScrapeOrchestrator(profile, db, currentJobId, checkpointPath);
      console.log('[Main Process] Orchestrator created');

      // Forward events to renderer and update job in database
      orchestrator.on('phase', (phase) => {
        if (currentJobId) {
          try {
            jobRepo.updatePhase(currentJobId, phase);
            console.log('[Main Process] Job phase updated:', phase);
          } catch (error) {
            console.error('[Main Process] Failed to update job phase:', error);
          }
        }
      });

      orchestrator.on('progress', (progress) => {
        if (currentJobId) {
          try {
            jobRepo.updateProgress(currentJobId, {
              productsScraped: progress.productsScraped,
              successCount: progress.successCount,
              failCount: progress.failCount,
            });
          } catch (error) {
            console.error('[Main Process] Failed to update job progress:', error);
          }
        }
        mainWindow.webContents.send(IPC_CHANNELS.SCRAPE_PROGRESS, progress);
      });

      orchestrator.on('product', (product) => {
        mainWindow.webContents.send(IPC_CHANNELS.SCRAPE_PRODUCT, product);
      });

      orchestrator.on('error', (error) => {
        // If this is a fatal error (not per-product error), mark job as failed
        if (currentJobId && error && typeof error === 'object' && !('url' in error)) {
          try {
            jobRepo.fail(currentJobId, error instanceof Error ? error.message : String(error));
          } catch (dbError) {
            console.error('[Main Process] Failed to mark job as failed:', dbError);
          }
        }
        mainWindow.webContents.send(IPC_CHANNELS.SCRAPE_ERROR, error);
      });

      orchestrator.on('complete', (stats) => {
        if (currentJobId) {
          try {
            jobRepo.complete(currentJobId, {
              productsScraped: stats.successCount + stats.failCount,
              successCount: stats.successCount,
              failCount: stats.failCount,
            });
          } catch (error) {
            console.error('[Main Process] Failed to mark job as complete:', error);
          }
        }
        mainWindow.webContents.send(IPC_CHANNELS.SCRAPE_COMPLETE, stats);
      });

      // Start scraping (non-blocking)
      console.log('[Main Process] Starting orchestrator...');
      orchestrator.start().catch(error => {
        console.error('[Main Process] Orchestrator error:', error);
        if (currentJobId) {
          try {
            jobRepo.fail(currentJobId, error instanceof Error ? error.message : String(error));
          } catch (dbError) {
            console.error('[Main Process] Failed to mark job as failed:', dbError);
          }
        }
        mainWindow.webContents.send(IPC_CHANNELS.SCRAPE_ERROR, error);
      });

      console.log('[Main Process] Orchestrator started, returning success');
      return { success: true, jobId: currentJobId };
    } catch (error) {
      console.error('[Main Process] Failed to start scraping:', error);
      throw error;
    }
  });

  // Pause scraping
  ipcMain.handle(IPC_CHANNELS.SCRAPE_PAUSE, async () => {
    if (orchestrator) {
      orchestrator.pause();
    }
    return { success: true };
  });

  // Resume scraping
  ipcMain.handle(IPC_CHANNELS.SCRAPE_RESUME, async () => {
    if (orchestrator) {
      orchestrator.resume();
    }
    return { success: true };
  });

  // Stop scraping
  ipcMain.handle(IPC_CHANNELS.SCRAPE_STOP, async () => {
    if (orchestrator) {
      await orchestrator.stop();

      // Mark job as stopped
      if (currentJobId) {
        try {
          const db = getDatabase();
          const jobRepo = new JobRepository(db);
          jobRepo.stop(currentJobId);
        } catch (error) {
          console.error('[Main Process] Failed to mark job as stopped:', error);
        }
      }

      orchestrator = null;
      currentJobId = null;
    }
    return { success: true };
  });
}
