import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import { ProfileRepository } from '../database/ProfileRepository';
import { getDatabase } from '../database/db';
import { SiteProfile } from '../../shared/types';

export function setupProfileHandlers(): void {
  const db = getDatabase();
  const profileRepo = new ProfileRepository(db);

  ipcMain.handle(IPC_CHANNELS.PROFILE_CREATE, async (event: IpcMainInvokeEvent, profile: SiteProfile) => {
    console.log('[IPC] Creating profile:', profile.name);
    const id = profileRepo.create(profile);
    return { id };
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_UPDATE, async (event: IpcMainInvokeEvent, id: string, profile: SiteProfile) => {
    console.log('[IPC] Updating profile:', id);
    profileRepo.update(id, profile);
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_DELETE, async (event: IpcMainInvokeEvent, id: string) => {
    console.log('[IPC] Deleting profile:', id);
    profileRepo.delete(id);
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_GET, async (event: IpcMainInvokeEvent, id: string) => {
    const profile = profileRepo.getById(id);
    return profile;
  });

  ipcMain.handle(IPC_CHANNELS.PROFILE_GET_ALL, async () => {
    const profiles = profileRepo.getAll();
    return profiles;
  });
}
