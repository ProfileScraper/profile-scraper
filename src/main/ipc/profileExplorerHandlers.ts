import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import { ProfileExplorerService } from '../services/ProfileExplorerService';
import { ProfileRepository } from '../database/ProfileRepository';
import { getDatabase } from '../database/db';

export function setupProfileExplorerHandlers(): void {
  const db = getDatabase();
  const profileRepo = new ProfileRepository(db);
  const profileExplorerService = new ProfileExplorerService(profileRepo);

  // Sync public profiles
  ipcMain.handle(IPC_CHANNELS.PROFILE_EXPLORER_SYNC, async () => {
    try {
      console.log('[IPC] Syncing profile explorer profiles');
      return await profileExplorerService.syncPublicProfiles();
    } catch (error) {
      console.error('[IPC] Error syncing profile explorer:', error);
      return {
        success: false,
        profilesAdded: 0,
        profilesUpdated: 0,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  });

  // Get public profiles
  ipcMain.handle(IPC_CHANNELS.PROFILE_EXPLORER_GET_ALL, async () => {
    try {
      console.log('[IPC] Getting public profiles');
      return profileExplorerService.getPublicProfiles();
    } catch (error) {
      console.error('[IPC] Error getting public profiles:', error);
      throw new Error(`Failed to get public profiles: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
}
