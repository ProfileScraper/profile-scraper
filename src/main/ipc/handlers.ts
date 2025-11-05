import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import { ScrapeOrchestrator } from '../scraper/ScrapeOrchestrator';
import { ScraperConfig, SiteProfile } from '../../shared/types';
import { validateConfig } from '../../shared/config-schema';
import * as fs from 'fs';
import * as path from 'path';

let orchestrator: ScrapeOrchestrator | null = null;

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
  ipcMain.handle(IPC_CHANNELS.SCRAPE_START, async (event: IpcMainInvokeEvent, profileName: string) => {
    const configPath = path.join(process.cwd(), 'configs', 'scraper-config.json');
    const data = fs.readFileSync(configPath, 'utf-8');
    const config: ScraperConfig = JSON.parse(data);

    const profile = config.profiles[profileName];
    if (!profile) {
      throw new Error(`Profile not found: ${profileName}`);
    }

    const outputDir = path.join(process.cwd(), 'output');
    const checkpointPath = path.join(outputDir, 'progress.json');

    orchestrator = new ScrapeOrchestrator(profile, outputDir, checkpointPath);

    // Forward events to renderer
    orchestrator.on('progress', (progress) => {
      mainWindow.webContents.send(IPC_CHANNELS.SCRAPE_PROGRESS, progress);
    });

    orchestrator.on('product', (product) => {
      mainWindow.webContents.send(IPC_CHANNELS.SCRAPE_PRODUCT, product);
    });

    orchestrator.on('error', (error) => {
      mainWindow.webContents.send(IPC_CHANNELS.SCRAPE_ERROR, error);
    });

    orchestrator.on('complete', (stats) => {
      mainWindow.webContents.send(IPC_CHANNELS.SCRAPE_COMPLETE, stats);
    });

    // Start scraping (non-blocking)
    orchestrator.start().catch(error => {
      mainWindow.webContents.send(IPC_CHANNELS.SCRAPE_ERROR, error);
    });

    return { success: true };
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
      orchestrator = null;
    }
    return { success: true };
  });
}
