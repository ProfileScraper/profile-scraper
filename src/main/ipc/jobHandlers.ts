import { ipcMain, IpcMainInvokeEvent, dialog } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import { JobRepository } from '../database/JobRepository';
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

      if (!job.outputDir) {
        throw new Error(`Job has no output directory: ${jobId}`);
      }

      const jsonPath = path.join(job.outputDir, 'data.json');
      if (!fs.existsSync(jsonPath)) {
        return []; // No data yet
      }

      const data = fs.readFileSync(jsonPath, 'utf-8');
      const products: ProductData[] = JSON.parse(data);
      return products;
    } catch (error) {
      console.error('[IPC] Error getting job data:', error);
      throw new Error(`Failed to get job data: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  /**
   * Export job data - opens save dialog and copies files
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

      if (!job.outputDir) {
        throw new Error(`Job has no output directory: ${jobId}`);
      }

      // Determine which files to export
      const filesToExport: { src: string; name: string }[] = [];
      if (format === 'json' || format === 'both') {
        const jsonPath = path.join(job.outputDir, 'data.json');
        if (fs.existsSync(jsonPath)) {
          filesToExport.push({ src: jsonPath, name: 'data.json' });
        }
      }
      if (format === 'csv' || format === 'both') {
        const csvPath = path.join(job.outputDir, 'data.csv');
        if (fs.existsSync(csvPath)) {
          filesToExport.push({ src: csvPath, name: 'data.csv' });
        }
      }

      if (filesToExport.length === 0) {
        throw new Error('No data files found for this job');
      }

      // Open save dialog
      const result = await dialog.showSaveDialog({
        title: 'Export Job Data',
        defaultPath: filesToExport.length === 1 ? filesToExport[0].name : `job-${jobId}-data`,
        properties: ['createDirectory', 'showOverwriteConfirmation'],
      });

      if (result.canceled || !result.filePath) {
        return { success: false, message: 'Export canceled' };
      }

      let exportPath = result.filePath;

      // If exporting both files, create a directory
      if (filesToExport.length > 1) {
        if (!fs.existsSync(exportPath)) {
          fs.mkdirSync(exportPath, { recursive: true });
        }
        for (const file of filesToExport) {
          const destPath = path.join(exportPath, file.name);
          fs.copyFileSync(file.src, destPath);
        }
      } else {
        // Single file export
        fs.copyFileSync(filesToExport[0].src, exportPath);
      }

      return { success: true, path: exportPath };
    } catch (error) {
      console.error('[IPC] Error exporting job data:', error);
      throw new Error(`Failed to export job data: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
}
