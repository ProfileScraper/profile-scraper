import { ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export function setupAppHandlers() {
  ipcMain.handle('app:get-version', async () => {
    try {
      const packagePath = path.join(__dirname, '../../../package.json');
      const packageData = fs.readFileSync(packagePath, 'utf8');
      const pkg = JSON.parse(packageData);
      return pkg.version;
    } catch (error) {
      console.error('[AppHandlers] Failed to read version:', error);
      return '1.5.3'; // fallback
    }
  });
}
