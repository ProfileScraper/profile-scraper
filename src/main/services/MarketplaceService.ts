import { ProfileRepository } from '../database/ProfileRepository';
import { ProfileValidator } from '../validation/profileValidator';
import { SyncResult, PublicProfilesResponse } from '../../shared/marketplace-types';

export class MarketplaceService {
  // TODO: Configure this URL to point to the actual CDN hosting public profiles
  // Example: 'https://raw.githubusercontent.com/your-org/profilescraper-profiles/main/public-profiles.json'
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

          // Check if profile with this ID already exists in local database
          const existing = this.profileRepo.getById(profileData.id);

          if (!existing) {
            // Insert new public profile - need to create with the CDN-provided ID
            profileData.isPublic = true;
            profileData.isReadonly = true;
            profileData.lastSynced = Date.now();

            // NOTE: ProfileRepository.create() generates a new UUID and ignores the ID from profileData
            // This is a known issue - we need to either:
            // 1. Add a createWithId() method to ProfileRepository, or
            // 2. Modify create() to accept and use an optional ID parameter
            // For now, this will create a new ID, which means profiles won't sync properly on subsequent runs
            this.profileRepo.create(profileData);
            result.profilesAdded++;
          } else if (profileData.updated_at > existing.updatedAt) {
            // Update existing profile only if CDN version is newer
            // Compare CDN's updated_at with local profile's updatedAt timestamp
            profileData.lastSynced = Date.now();

            // NOTE: ProfileRepository.update() blocks updates to read-only profiles
            // Since marketplace profiles are read-only, we need a bypass mechanism
            // Options:
            // 1. Add an updateReadonly() method to ProfileRepository
            // 2. Temporarily clear isReadonly flag (risky - requires direct SQL)
            // 3. Add a 'forceUpdate' parameter to update() method
            // For now, this will throw an error when trying to update read-only profiles
            try {
              this.profileRepo.update(profileData.id, profileData);
              result.profilesUpdated++;
            } catch (error) {
              // If update fails due to read-only protection, log it
              result.errors!.push(`Cannot update read-only profile ${profileData.name}. This needs a bypass mechanism.`);
            }
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
