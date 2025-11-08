import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import { ProfileRepository } from '../database/ProfileRepository';
import { getDatabase } from '../database/db';
import { SiteProfile } from '../../shared/types';
import { ProfileImportExport } from '../services/ProfileImportExport';

/**
 * Validates if a string is a valid UUID v4 format
 */
function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export function setupProfileHandlers(): void {
  const db = getDatabase();
  const profileRepo = new ProfileRepository(db);
  const importExportService = new ProfileImportExport(profileRepo);

  ipcMain.handle(IPC_CHANNELS.PROFILE_CREATE, async (event: IpcMainInvokeEvent, profile: SiteProfile) => {
    try {
      console.log('[IPC] Creating profile:', profile.name);
      const id = profileRepo.create(profile);
      return { id };
    } catch (error) {
      console.error('[IPC] Error creating profile:', error);
      throw new Error(`Failed to create profile: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_UPDATE, async (event: IpcMainInvokeEvent, id: string, profile: SiteProfile) => {
    try {
      if (!isValidUUID(id)) {
        throw new Error(`Invalid profile ID format: ${id}`);
      }
      console.log('[IPC] Updating profile:', id);
      console.log('[IPC] Profile settings: headless=', profile.headless, 'overwriteExisting=', profile.overwriteExisting);
      profileRepo.update(id, profile);
      return { success: true };
    } catch (error) {
      console.error('[IPC] Error updating profile:', error);
      throw new Error(`Failed to update profile: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_DELETE, async (event: IpcMainInvokeEvent, id: string) => {
    try {
      if (!isValidUUID(id)) {
        throw new Error(`Invalid profile ID format: ${id}`);
      }
      console.log('[IPC] Deleting profile:', id);
      profileRepo.delete(id);
      return { success: true };
    } catch (error) {
      console.error('[IPC] Error deleting profile:', error);
      throw new Error(`Failed to delete profile: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_GET, async (event: IpcMainInvokeEvent, id: string) => {
    try {
      if (!isValidUUID(id)) {
        throw new Error(`Invalid profile ID format: ${id}`);
      }
      const profile = profileRepo.getById(id);
      return profile;
    } catch (error) {
      console.error('[IPC] Error getting profile:', error);
      throw new Error(`Failed to get profile: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_GET_ALL, async () => {
    try {
      const profiles = profileRepo.getAll();
      return profiles;
    } catch (error) {
      console.error('[IPC] Error getting all profiles:', error);
      throw new Error(`Failed to get all profiles: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  // Export profile
  ipcMain.handle(IPC_CHANNELS.PROFILE_EXPORT, async (event: IpcMainInvokeEvent, profileId: string) => {
    try {
      console.log('[IPC] Exporting profile:', profileId);
      const filePath = await importExportService.exportProfile(profileId);
      return { success: true, filePath };
    } catch (error) {
      console.error('[IPC] Error exporting profile:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // Import from file
  ipcMain.handle(IPC_CHANNELS.PROFILE_IMPORT_FILE, async () => {
    try {
      console.log('[IPC] Importing profile from file');
      const result = await importExportService.importFromFile();
      return result;
    } catch (error) {
      console.error('[IPC] Error importing profile from file:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  });

  // Import from URL
  ipcMain.handle(IPC_CHANNELS.PROFILE_IMPORT_URL, async (event: IpcMainInvokeEvent, url: string) => {
    try {
      console.log('[IPC] Importing profile from URL:', url);
      const result = await importExportService.importFromURL(url);
      return result;
    } catch (error) {
      console.error('[IPC] Error importing profile from URL:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  });

  // Validate JSON
  ipcMain.handle(IPC_CHANNELS.PROFILE_VALIDATE_JSON, async (event: IpcMainInvokeEvent, json: string) => {
    try {
      console.log('[IPC] Validating profile JSON');
      const result = importExportService.validateJSON(json);
      return result;
    } catch (error) {
      console.error('[IPC] Error validating profile JSON:', error);
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
      };
    }
  });

  // Clone profile
  ipcMain.handle(IPC_CHANNELS.PROFILE_CLONE, async (event: IpcMainInvokeEvent, sourceId: string) => {
    try {
      if (!isValidUUID(sourceId)) {
        throw new Error(`Invalid profile ID format: ${sourceId}`);
      }
      console.log('[IPC] Cloning profile:', sourceId);
      const source = profileRepo.getById(sourceId);
      if (!source) {
        throw new Error('Source profile not found');
      }

      // Create clone
      const clone = {
        ...source,
        name: `${source.name} (Copy)`,
        sourceProfileId: source.id,
        isReadonly: false,
        isPublic: false,
      };

      const newId = profileRepo.create(clone);
      return { success: true, profileId: newId };

    } catch (error) {
      console.error('[IPC] Error cloning profile:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_TOGGLE_IN_LIBRARY, async (event: IpcMainInvokeEvent, id: string, inLibrary: boolean) => {
    try {
      if (!isValidUUID(id)) {
        throw new Error(`Invalid profile ID format: ${id}`);
      }
      console.log('[IPC] Toggling inLibrary for profile:', id, 'to', inLibrary);
      profileRepo.toggleInLibrary(id, inLibrary);
      return { success: true };
    } catch (error) {
      console.error('[IPC] Error toggling inLibrary:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });
}
