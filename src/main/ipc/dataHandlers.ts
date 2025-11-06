import { ipcMain, IpcMainInvokeEvent, dialog } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import { ProductRepository, ProductFilter } from '../database/ProductRepository';
import { DataExporter } from '../storage/DataExporter';
import { getDatabase } from '../database/db';
import * as path from 'path';

export function setupDataHandlers(): void {
  const db = getDatabase();
  const productRepo = new ProductRepository(db);
  const exporter = new DataExporter(db);

  // Get products for a specific job with pagination
  ipcMain.handle(
    IPC_CHANNELS.DATA_GET_PRODUCTS,
    async (event: IpcMainInvokeEvent, jobId: string, limit: number = 100, offset: number = 0) => {
      try {
        const products = productRepo.getByJobId(jobId, limit, offset);
        return products.map(p => ({
          id: p.id,
          url: p.url,
          scrapedAt: new Date(p.scraped_at).toISOString(),
          fields: p.fields,
        }));
      } catch (error) {
        console.error('[IPC] Error getting products:', error);
        throw new Error(`Failed to get products: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  // Get product count for a job
  ipcMain.handle(
    IPC_CHANNELS.DATA_GET_PRODUCT_COUNT,
    async (event: IpcMainInvokeEvent, jobId: string) => {
      try {
        const count = productRepo.countByJobId(jobId);
        return { count };
      } catch (error) {
        console.error('[IPC] Error getting product count:', error);
        throw new Error(`Failed to get product count: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  // Search products with filters
  ipcMain.handle(
    IPC_CHANNELS.DATA_SEARCH_PRODUCTS,
    async (event: IpcMainInvokeEvent, filter: ProductFilter) => {
      try {
        const products = productRepo.search(filter);
        return products.map(p => ({
          id: p.id,
          url: p.url,
          scrapedAt: new Date(p.scraped_at).toISOString(),
          fields: p.fields,
        }));
      } catch (error) {
        console.error('[IPC] Error searching products:', error);
        throw new Error(`Failed to search products: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  // Delete all products for a job
  ipcMain.handle(
    IPC_CHANNELS.DATA_DELETE_BY_JOB,
    async (event: IpcMainInvokeEvent, jobId: string) => {
      try {
        const deleted = productRepo.deleteByJobId(jobId);
        console.log(`[IPC] Deleted ${deleted} products for job ${jobId}`);
        return { deleted };
      } catch (error) {
        console.error('[IPC] Error deleting products:', error);
        throw new Error(`Failed to delete products: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  // Delete products older than a date
  ipcMain.handle(
    IPC_CHANNELS.DATA_DELETE_OLD,
    async (event: IpcMainInvokeEvent, timestampMs: number) => {
      try {
        const deleted = productRepo.deleteOlderThan(timestampMs);
        console.log(`[IPC] Deleted ${deleted} products older than ${new Date(timestampMs).toISOString()}`);
        return { deleted };
      } catch (error) {
        console.error('[IPC] Error deleting old products:', error);
        throw new Error(`Failed to delete old products: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  // Export data
  ipcMain.handle(
    IPC_CHANNELS.DATA_EXPORT,
    async (
      event: IpcMainInvokeEvent,
      options: {
        filter?: ProductFilter;
        format: 'json' | 'csv';
        defaultPath?: string;
      }
    ) => {
      try {
        // Show save dialog
        const result = await dialog.showSaveDialog({
          title: 'Export Products',
          defaultPath: options.defaultPath || `products_export.${options.format}`,
          filters: [
            {
              name: options.format.toUpperCase(),
              extensions: [options.format],
            },
          ],
        });

        if (result.canceled || !result.filePath) {
          return { canceled: true };
        }

        const count = await exporter.exportFiltered(
          result.filePath,
          options.format,
          options.filter || {}
        );

        return {
          success: true,
          filePath: result.filePath,
          count,
        };
      } catch (error) {
        console.error('[IPC] Error exporting data:', error);
        throw new Error(`Failed to export data: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );

  // Get database statistics
  ipcMain.handle(IPC_CHANNELS.DATA_GET_STATS, async () => {
    try {
      const stats = productRepo.getStats();
      return {
        totalProducts: stats.totalProducts,
        totalFields: stats.totalFields,
        oldestScrape: stats.oldestScrape ? new Date(stats.oldestScrape).toISOString() : null,
        newestScrape: stats.newestScrape ? new Date(stats.newestScrape).toISOString() : null,
      };
    } catch (error) {
      console.error('[IPC] Error getting stats:', error);
      throw new Error(`Failed to get stats: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  // Get unique field names
  ipcMain.handle(
    IPC_CHANNELS.DATA_GET_FIELD_NAMES,
    async (event: IpcMainInvokeEvent, jobId?: string) => {
      try {
        const fieldNames = productRepo.getFieldNames(jobId);
        return fieldNames;
      } catch (error) {
        console.error('[IPC] Error getting field names:', error);
        throw new Error(`Failed to get field names: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  );
}
