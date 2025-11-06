import { ipcMain, IpcMainInvokeEvent, dialog } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import { JobRepository } from '../database/JobRepository';
import { ProductRepository } from '../database/ProductRepository';
import { DataExporter } from '../storage/DataExporter';
import { getDatabase } from '../database/db';
import { ProductData } from '../../shared/types';

/**
 * Validates if a string is a valid UUID v4 format
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export interface JobError {
  id: number;
  jobId: string;
  url: string;
  errorMessage: string;
  timestamp: number;
}

export function setupJobHandlers(): void {
  const db = getDatabase();
  const jobRepo = new JobRepository(db);
  const productRepo = new ProductRepository(db);
  const exporter = new DataExporter(db);

  /**
   * Get all jobs with optional filtering
   */
  ipcMain.handle(IPC_CHANNELS.JOB_GET_ALL, async (event: IpcMainInvokeEvent, filter?: { profileId?: string; status?: string }) => {
    try {
      console.log('[IPC] Getting all jobs with filter:', filter);

      let jobs;
      if (filter?.profileId) {
        if (!isValidUUID(filter.profileId)) {
          throw new Error(`Invalid profile ID format: ${filter.profileId}`);
        }
        jobs = jobRepo.getByProfileId(filter.profileId);
      } else {
        jobs = jobRepo.getAll();
      }

      // Apply status filter if provided
      if (filter?.status) {
        jobs = jobs.filter(job => job.status === filter.status);
      }

      return jobs;
    } catch (error) {
      console.error('[IPC] Error getting all jobs:', error);
      throw new Error(`Failed to get all jobs: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  /**
   * Get a specific job by ID
   */
  ipcMain.handle(IPC_CHANNELS.JOB_GET, async (event: IpcMainInvokeEvent, id: string) => {
    try {
      if (!isValidUUID(id)) {
        throw new Error(`Invalid job ID format: ${id}`);
      }
      console.log('[IPC] Getting job:', id);
      const job = jobRepo.getById(id);
      return job;
    } catch (error) {
      console.error('[IPC] Error getting job:', error);
      throw new Error(`Failed to get job: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  /**
   * Get errors for a specific job
   */
  ipcMain.handle(IPC_CHANNELS.JOB_GET_ERRORS, async (event: IpcMainInvokeEvent, jobId: string) => {
    try {
      if (!isValidUUID(jobId)) {
        throw new Error(`Invalid job ID format: ${jobId}`);
      }
      console.log('[IPC] Getting errors for job:', jobId);

      // Query job_errors table
      const stmt = db.prepare('SELECT * FROM job_errors WHERE job_id = ? ORDER BY timestamp DESC');
      const rows = stmt.all(jobId) as Array<{
        id: number;
        job_id: string;
        url: string;
        error_message: string;
        timestamp: number;
      }>;

      // Map to JobError interface
      const errors: JobError[] = rows.map(row => ({
        id: row.id,
        jobId: row.job_id,
        url: row.url,
        errorMessage: row.error_message,
        timestamp: row.timestamp
      }));

      return errors;
    } catch (error) {
      console.error('[IPC] Error getting job errors:', error);
      throw new Error(`Failed to get job errors: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  /**
   * Get scraped data for a specific job
   */
  ipcMain.handle(IPC_CHANNELS.JOB_GET_DATA, async (event: IpcMainInvokeEvent, jobId: string) => {
    try {
      if (!isValidUUID(jobId)) {
        throw new Error(`Invalid job ID format: ${jobId}`);
      }
      console.log('[IPC] Getting data for job:', jobId);

      const job = jobRepo.getById(jobId);
      if (!job) {
        throw new Error(`Job not found: ${jobId}`);
      }

      // Get products from database (default limit 100, can be increased if needed)
      const products = productRepo.getByJobId(jobId, 1000, 0);

      // Convert to ProductData format expected by UI, including product ID
      return products.map(p => ({
        id: p.id,
        url: p.url,
        scrapedAt: new Date(p.scraped_at).toISOString(),
        fields: p.fields,
      }));
    } catch (error) {
      console.error('[IPC] Error getting job data:', error);
      throw new Error(`Failed to get job data: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  /**
   * Export job data - generates files from database and opens save dialog
   */
  ipcMain.handle(IPC_CHANNELS.JOB_EXPORT_DATA, async (event: IpcMainInvokeEvent, jobId: string, format: 'json' | 'csv' | 'both') => {
    try {
      if (!isValidUUID(jobId)) {
        throw new Error(`Invalid job ID format: ${jobId}`);
      }
      console.log('[IPC] Exporting data for job:', jobId, 'format:', format);

      const job = jobRepo.getById(jobId);
      if (!job) {
        throw new Error(`Job not found: ${jobId}`);
      }

      // Check if job has data
      const count = productRepo.countByJobId(jobId);
      if (count === 0) {
        throw new Error('No data available for this job');
      }

      // Create temporary directory for export files
      const tempDir = path.join(job.outputDir || path.join(process.cwd(), 'temp'), 'export');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Export data from database to temp files
      const result = await exporter.exportJobData(jobId, tempDir, format);

      if (!result.json && !result.csv) {
        throw new Error('Export failed - no files generated');
      }

      // Open save dialog
      const saveResult = await dialog.showSaveDialog({
        title: 'Export Job Data',
        defaultPath: format === 'both' ? `job-${jobId.substring(0, 8)}-data` :
                     format === 'json' ? `job-${jobId.substring(0, 8)}-data.json` :
                     `job-${jobId.substring(0, 8)}-data.csv`,
        properties: ['createDirectory', 'showOverwriteConfirmation'],
      });

      if (saveResult.canceled || !saveResult.filePath) {
        // Clean up temp files
        if (result.json && fs.existsSync(result.json)) fs.unlinkSync(result.json);
        if (result.csv && fs.existsSync(result.csv)) fs.unlinkSync(result.csv);
        return { success: false, message: 'Export canceled' };
      }

      let exportPath = saveResult.filePath;

      // Copy files to destination
      if (format === 'both') {
        // Create directory for both files
        if (!fs.existsSync(exportPath)) {
          fs.mkdirSync(exportPath, { recursive: true });
        }
        if (result.json) {
          fs.copyFileSync(result.json, path.join(exportPath, 'data.json'));
          fs.unlinkSync(result.json);
        }
        if (result.csv) {
          fs.copyFileSync(result.csv, path.join(exportPath, 'data.csv'));
          fs.unlinkSync(result.csv);
        }
      } else {
        // Single file export
        const sourceFile = format === 'json' ? result.json : result.csv;
        if (sourceFile) {
          fs.copyFileSync(sourceFile, exportPath);
          fs.unlinkSync(sourceFile);
        }
      }

      console.log(`[IPC] Exported ${result.count} products to ${exportPath}`);
      return { success: true, path: exportPath };
    } catch (error) {
      console.error('[IPC] Error exporting job data:', error);
      throw new Error(`Failed to export job data: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  /**
   * Delete a specific job
   */
  ipcMain.handle(IPC_CHANNELS.JOB_DELETE, async (event: IpcMainInvokeEvent, jobId: string) => {
    try {
      if (!isValidUUID(jobId)) {
        throw new Error(`Invalid job ID format: ${jobId}`);
      }
      console.log('[IPC] Deleting job:', jobId);

      // Delete from database (cascade will delete products and errors)
      jobRepo.delete(jobId);

      // Optionally clean up output directory
      const job = jobRepo.getById(jobId);
      if (job?.outputDir && fs.existsSync(job.outputDir)) {
        fs.rmSync(job.outputDir, { recursive: true, force: true });
        console.log('[IPC] Deleted output directory:', job.outputDir);
      }

      return { success: true };
    } catch (error) {
      console.error('[IPC] Error deleting job:', error);
      throw new Error(`Failed to delete job: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  /**
   * Delete all jobs with no products (legacy/empty jobs)
   */
  ipcMain.handle(IPC_CHANNELS.JOB_DELETE_EMPTY, async () => {
    try {
      console.log('[IPC] Deleting empty jobs...');
      const deleted = jobRepo.deleteEmptyJobs();
      console.log(`[IPC] Deleted ${deleted} empty jobs`);
      return { success: true, deleted };
    } catch (error) {
      console.error('[IPC] Error deleting empty jobs:', error);
      throw new Error(`Failed to delete empty jobs: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  /**
   * Get data quality statistics for a specific job
   */
  ipcMain.handle(IPC_CHANNELS.JOB_GET_QUALITY_STATS, async (event: IpcMainInvokeEvent, jobId: string) => {
    try {
      if (!isValidUUID(jobId)) {
        throw new Error(`Invalid job ID format: ${jobId}`);
      }
      console.log('[IPC] Getting quality stats for job:', jobId);
      const stats = productRepo.getJobQualityStats(jobId);
      return stats;
    } catch (error) {
      console.error('[IPC] Error getting quality stats:', error);
      throw new Error(`Failed to get quality stats: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
}
