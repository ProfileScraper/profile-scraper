// ============================================================================
// INITIALIZATION LOGS
// ============================================================================
console.log('========================================');
console.log('ProfileScraper - Application Starting');
console.log('========================================');
console.log('[Init] Node version:', process.version);
console.log('[Init] Electron version:', process.versions.electron);
console.log('[Init] Platform:', process.platform);
console.log('[Init] Architecture:', process.arch);
console.log('[Init] NODE_ENV:', process.env.NODE_ENV);
console.log('[Init] cwd:', process.cwd());

// Load environment variables in development
if (process.env.NODE_ENV === 'development') {
  try {
    require('dotenv').config();
    console.log('[Init] dotenv loaded successfully');
  } catch (error) {
    console.log('[Init] dotenv not available (production mode)');
  }
}

// Set Playwright browsers path - will be configured after app ready
import * as path from 'path';
import * as fs from 'fs';

import { app, BrowserWindow } from 'electron';
import { setupIpcHandlers } from './ipc/handlers';
import { setupProfileHandlers } from './ipc/profileHandlers';
import { setupJobHandlers } from './ipc/jobHandlers';
import { setupTestHandlers } from './ipc/testHandlers';
import { setupInspectorHandlers } from './ipc/inspectorHandlers';
import { setupDataHandlers } from './ipc/dataHandlers';
import { setupLogHandlers } from './ipc/logHandlers';
import { setupProfileExplorerHandlers } from './ipc/profileExplorerHandlers';
import { setupGitHubHandlers } from './ipc/githubHandlers';
import { initDatabase } from './database/db';
import { migrateFromJSON } from './database/migration';
import { BrowserDownloadService } from './services/BrowserDownloadService';

let mainWindow: BrowserWindow | null = null;

async function createWindow(): Promise<void> {
  try {
    console.log('========================================');
    console.log('[Main] Creating Main Window');
    console.log('========================================');
    console.log('[Main] app.isPackaged:', app.isPackaged);
    console.log('[Main] app.getAppPath():', app.getAppPath());
    console.log('[Main] app.getPath("userData"):', app.getPath('userData'));
    console.log('[Main] app.getPath("exe"):', app.getPath('exe'));

    // Initialize database before creating window
    console.log('[Main] Initializing database...');
    initDatabase();
    console.log('[Main] Database initialized');

    // Run automatic migration from JSON to SQLite
    console.log('[Main] Running migration...');
    await migrateFromJSON();
    console.log('[Main] Migration complete');

    // Set up browser path for first-run download
    console.log('[Main] Setting up browser path...');
    const browserService = new BrowserDownloadService();
    const browsersPath = browserService.getBrowsersPath();
    process.env.PLAYWRIGHT_BROWSERS_PATH = browsersPath;
    console.log('[Main] PLAYWRIGHT_BROWSERS_PATH set to:', browsersPath);

    const browserInfo = browserService.getBrowserInfo();
    console.log('[Main] Browser info:', browserInfo);

  const preloadPath = path.join(__dirname, 'preload.js');
  console.log('[Main] Creating window with preload path:', preloadPath);
  console.log('[Main] __dirname:', __dirname);
  console.log('[Main] Preload file exists:', fs.existsSync(preloadPath));

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
    },
  });

  // In development, load from Vite dev server
  if (process.env.NODE_ENV === 'development') {
    console.log('[Main] Loading from Vite dev server: http://localhost:5174');
    mainWindow.loadURL('http://localhost:5174');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from built files
    // __dirname in production is app.asar/dist/main/main
    // We need to go up to app.asar/dist/renderer/index.html
    const rendererPath = path.join(__dirname, '../../renderer/index.html');
    console.log('[Main] Loading renderer from:', rendererPath);
    console.log('[Main] Renderer file exists:', fs.existsSync(rendererPath));
    mainWindow.loadFile(rendererPath);
  }

  console.log('[Main] Setting up IPC handlers...');
  setupIpcHandlers(mainWindow);
  setupProfileHandlers();
  setupJobHandlers();
  setupTestHandlers();
  setupInspectorHandlers(mainWindow);
  setupDataHandlers();
  setupLogHandlers();
  setupProfileExplorerHandlers();
  setupGitHubHandlers(mainWindow);

  // Import and setup browser handlers
  const { setupBrowserHandlers } = require('./ipc/browserHandlers');
  setupBrowserHandlers();

  console.log('[Main] IPC handlers configured');

    mainWindow.on('closed', () => {
      console.log('[Main] Main window closed');
      mainWindow = null;
    });

    console.log('[Main] Window created successfully');
    console.log('========================================');
  } catch (error) {
    console.error('[Main] Error creating window:', error);
    throw error;
  }
}

app.on('ready', () => {
  console.log('[App] App ready event fired');
  createWindow();
});

app.on('window-all-closed', () => {
  console.log('[App] All windows closed');
  if (process.platform !== 'darwin') {
    console.log('[App] Quitting application');
    app.quit();
  }
});

app.on('activate', () => {
  console.log('[App] Activate event fired');
  if (mainWindow === null) {
    createWindow();
  }
});
