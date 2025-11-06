import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import { ProfileRepository } from '../database/ProfileRepository';
import { getDatabase } from '../database/db';
import { SiteProfile } from '../../shared/types';

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
}
