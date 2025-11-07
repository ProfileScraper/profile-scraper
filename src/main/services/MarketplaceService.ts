import { ProfileRepository } from '../database/ProfileRepository';
import { ProfileValidator } from '../validation/profileValidator';
import { SyncResult, PublicProfilesResponse } from '../../shared/marketplace-types';

export class MarketplaceService {
  private cdnUrl = 'https://raw.githubusercontent.com/yourusername/profilescraper-profiles/main/public-profiles.json';

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

          // Check if exists
          const existing = this.profileRepo.getById(profileData.id);

          if (!existing) {
            // Insert new public profile
            profileData.isPublic = true;
            profileData.isReadonly = true;
            profileData.lastSynced = Date.now();
            this.profileRepo.create(profileData);
            result.profilesAdded++;
          } else if (profileData.updated_at > (existing.lastSynced || 0)) {
            // Update existing (if newer)
            profileData.lastSynced = Date.now();
            this.profileRepo.update(profileData.id, profileData);
            result.profilesUpdated++;
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
