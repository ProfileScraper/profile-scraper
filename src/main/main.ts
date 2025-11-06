import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { setupIpcHandlers } from './ipc/handlers';
import { setupProfileHandlers } from './ipc/profileHandlers';
import { setupJobHandlers } from './ipc/jobHandlers';
import { initDatabase } from './database/db';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  // Initialize database before creating window
  initDatabase();

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
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  setupIpcHandlers(mainWindow);
  setupProfileHandlers();
  setupJobHandlers();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
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
