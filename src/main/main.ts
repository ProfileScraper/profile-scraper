import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { setupIpcHandlers } from './ipc/handlers';
import { setupProfileHandlers } from './ipc/profileHandlers';
import { setupJobHandlers } from './ipc/jobHandlers';
import { setupTestHandlers } from './ipc/testHandlers';
import { setupInspectorHandlers } from './ipc/inspectorHandlers';
import { setupDataHandlers } from './ipc/dataHandlers';
import { setupLogHandlers } from './ipc/logHandlers';
import { initDatabase } from './database/db';
import { migrateFromJSON } from './database/migration';

let mainWindow: BrowserWindow | null = null;

async function createWindow(): Promise<void> {
  try {
    console.log('[Main] Starting createWindow...');

    // Initialize database before creating window
    console.log('[Main] Initializing database...');
    initDatabase();
    console.log('[Main] Database initialized');

    // Run automatic migration from JSON to SQLite
    console.log('[Main] Running migration...');
    await migrateFromJSON();
    console.log('[Main] Migration complete');

  const preloadPath = path.join(__dirname, 'preload.js');
  console.log('[Main] Creating window with preload path:', preloadPath);
  console.log('[Main] __dirname:', __dirname);
  console.log('[Main] Preload file exists:', require('fs').existsSync(preloadPath));

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
    mainWindow.loadURL('http://localhost:5174');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from built files
    // __dirname in production is app.asar/dist/main/main
    // We need to go up to app.asar/dist/renderer/index.html
    const rendererPath = path.join(__dirname, '../../renderer/index.html');
    console.log('[Main] Loading renderer from:', rendererPath);
    console.log('[Main] Renderer file exists:', require('fs').existsSync(rendererPath));
    mainWindow.loadFile(rendererPath);
  }

  setupIpcHandlers(mainWindow);
  setupProfileHandlers();
  setupJobHandlers();
  setupTestHandlers();
  setupInspectorHandlers(mainWindow);
  setupDataHandlers();
  setupLogHandlers();

    mainWindow.on('closed', () => {
      mainWindow = null;
    });

    console.log('[Main] Window created successfully');
  } catch (error) {
    console.error('[Main] Error creating window:', error);
    throw error;
  }
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
