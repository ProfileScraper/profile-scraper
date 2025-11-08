import { ipcMain, app } from 'electron';

export function setupAppHandlers() {
  ipcMain.handle('app:get-version', async () => {
    return app.getVersion();
  });
}
