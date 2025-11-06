import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import { ProductLogRepository } from '../database/ProductLogRepository';
import { getDatabase } from '../database/db';

export function setupLogHandlers(): void {
  const db = getDatabase();
  const logRepo = new ProductLogRepository(db);

  /**
   * Get all logs for a specific product
   */
  ipcMain.handle(IPC_CHANNELS.LOGS_GET_BY_PRODUCT_ID, async (event: IpcMainInvokeEvent, productId: number) => {
    try {
      console.log('[IPC] Getting logs for product:', productId);
      const logs = logRepo.getByProductId(productId);
      return logs;
    } catch (error) {
      console.error('[IPC] Error getting product logs:', error);
      throw new Error(`Failed to get product logs: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  /**
   * Get all logs for a job (grouped by product)
   */
  ipcMain.handle(IPC_CHANNELS.LOGS_GET_BY_JOB_ID, async (event: IpcMainInvokeEvent, jobId: string) => {
    try {
      console.log('[IPC] Getting logs for job:', jobId);
      const logs = logRepo.getByJobId(jobId);
      return logs;
    } catch (error) {
      console.error('[IPC] Error getting job logs:', error);
      throw new Error(`Failed to get job logs: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
}
