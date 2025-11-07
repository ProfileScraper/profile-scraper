import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import { MarketplaceService } from '../services/MarketplaceService';
import { ProfileRepository } from '../database/ProfileRepository';
import { getDatabase } from '../database/db';

export function setupMarketplaceHandlers(): void {
  const db = getDatabase();
  const profileRepo = new ProfileRepository(db);
  const marketplaceService = new MarketplaceService(profileRepo);

  // Sync public profiles
  ipcMain.handle(IPC_CHANNELS.MARKETPLACE_SYNC, async () => {
    try {
      console.log('[IPC] Syncing marketplace profiles');
      return await marketplaceService.syncPublicProfiles();
    } catch (error) {
      console.error('[IPC] Error syncing marketplace:', error);
      return {
        success: false,
        profilesAdded: 0,
        profilesUpdated: 0,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  });

  // Get public profiles
  ipcMain.handle(IPC_CHANNELS.MARKETPLACE_GET_ALL, async () => {
    try {
      console.log('[IPC] Getting public profiles');
      return marketplaceService.getPublicProfiles();
    } catch (error) {
      console.error('[IPC] Error getting public profiles:', error);
      throw new Error(`Failed to get public profiles: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
}
