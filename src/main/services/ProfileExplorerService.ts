import { ProfileRepository } from '../database/ProfileRepository';
import { ProfileValidator } from '../validation/profileValidator';
import { SyncResult, PublicProfilesResponse } from '../../shared/profileExplorer-types';

export class ProfileExplorerService {
  private cdnUrl = 'https://raw.githubusercontent.com/ProfileScraper/profile-explorer/master/public-profiles.json';

  constructor(private profileRepo: ProfileRepository) {}

  async syncPublicProfiles(): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      profilesAdded: 0,
      profilesUpdated: 0,
      errors: [],
    };

    try {
      // Fetch CDN
      const response = await fetch(this.cdnUrl);

      if (!response.ok) {
        result.errors!.push(`CDN returned ${response.status}: ${response.statusText}`);
        return result;
      }

      const data = await response.json() as PublicProfilesResponse;

      // Process each profile
      for (const profileData of data.profiles) {
        try {
          // Validate
          const validation = ProfileValidator.validate(JSON.stringify(profileData));
          if (!validation.valid) {
            result.errors!.push(`Profile ${profileData.name} validation failed: ${validation.errors.join(', ')}`);
            continue;
          }

          // Check if profile with this ID already exists in local database
          const existing = this.profileRepo.getById(profileData.id);

          if (!existing) {
            // Insert new public profile with the CDN-provided ID
            profileData.isPublic = true;
            profileData.isReadonly = true;
            profileData.inLibrary = false; // Not in library by default
            profileData.lastSynced = Date.now();

            // Use createWithId to preserve the CDN ID
            this.profileRepo.createWithId(profileData.id, profileData);
            result.profilesAdded++;
            console.log(`[ProfileExplorer] Added profile: ${profileData.name} (${profileData.id})`);
          } else if (profileData.updated_at > existing.updatedAt) {
            // Update existing profile only if CDN version is newer
            profileData.lastSynced = Date.now();
            // Preserve the existing inLibrary status
            profileData.inLibrary = existing.inLibrary;

            // Use syncUpdate to bypass read-only protection
            this.profileRepo.syncUpdate(profileData.id, profileData);
            result.profilesUpdated++;
            console.log(`[ProfileExplorer] Updated profile: ${profileData.name} (${profileData.id})`);
          } else {
            console.log(`[ProfileExplorer] Profile already up to date: ${profileData.name} (${profileData.id})`);
          }

        } catch (error) {
          result.errors!.push(`Failed to sync ${profileData.name}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      result.success = true;

    } catch (error) {
      result.errors!.push(`Sync failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }

  getPublicProfiles() {
    // Get all public profiles from local database
    const all = this.profileRepo.getAll();
    return all.filter(p => p.isPublic);
  }
}
