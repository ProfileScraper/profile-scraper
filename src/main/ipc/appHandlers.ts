import { ipcMain, app, shell } from 'electron';
import { UpdateChecker } from '../services/updateChecker';

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
}
