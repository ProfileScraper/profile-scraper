import * as fs from 'fs';
import * as path from 'path';
import { ProfileRepository } from './ProfileRepository';
import { getDatabase } from './db';
import { ScraperConfig, SiteProfile } from '../../shared/types';

interface MigrationResult {
  success: boolean;
  profilesMigrated: number;
  profilesSkipped: number;
  errors: string[];
}

/**
 * Migrates profiles from the old JSON config format to SQLite database.
 * This function is idempotent and safe to run multiple times.
 */
export async function migrateFromJSON(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    profilesMigrated: 0,
    profilesSkipped: 0,
    errors: []
  };

  const configPath = path.join(process.cwd(), 'configs', 'scraper-config.json');
  const backupPath = path.join(process.cwd(), 'configs', 'scraper-config.json.backup');

  // Check if JSON config file exists
  if (!fs.existsSync(configPath)) {
    console.log('[Migration] No JSON config file found at:', configPath);
    return result;
  }

  console.log('[Migration] Starting migration from JSON to SQLite...');
  console.log('[Migration] Config path:', configPath);

  // Read and parse JSON config
  let config: ScraperConfig;
  try {
    const configContent = fs.readFileSync(configPath, 'utf-8');
    config = JSON.parse(configContent);
  } catch (error) {
    const errorMsg = `Failed to read or parse JSON config: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error('[Migration]', errorMsg);
    result.success = false;
    result.errors.push(errorMsg);
    return result;
  }

  // Validate config format
  if (!config.profiles || typeof config.profiles !== 'object') {
    console.log('[Migration] No profiles found in config or invalid format');
    return result;
  }

  const profileKeys = Object.keys(config.profiles);
  if (profileKeys.length === 0) {
    console.log('[Migration] Profiles object is empty, nothing to migrate');
    return result;
  }

  console.log(`[Migration] Found ${profileKeys.length} profile(s) in JSON config`);

  // Get database and repository
  const db = getDatabase();
  const profileRepo = new ProfileRepository(db);

  // Get existing profiles to check for duplicates
  const existingProfiles = profileRepo.getAll();
  const existingNames = new Set(existingProfiles.map(p => p.name));

  // Migrate each profile
  for (const [profileKey, profile] of Object.entries(config.profiles)) {
    try {
      // Validate required fields
      if (!profile.name || !profile.categoryUrl) {
        const errorMsg = `Profile '${profileKey}' missing required fields (name or categoryUrl), skipping`;
        console.warn('[Migration]', errorMsg);
        result.errors.push(errorMsg);
        result.profilesSkipped++;
        continue;
      }

      // Validate field types
      if (!validateProfile(profile)) {
        const errorMsg = `Profile '${profileKey}' has invalid field types, skipping`;
        console.warn('[Migration]', errorMsg);
        result.errors.push(errorMsg);
        result.profilesSkipped++;
        continue;
      }

      // Check if profile with same name already exists
      let profileName = profile.name;
      if (existingNames.has(profileName)) {
        // Generate unique name by adding suffix
        let suffix = 1;
        while (existingNames.has(`${profileName} (${suffix})`)) {
          suffix++;
        }
        profileName = `${profileName} (${suffix})`;
        console.log(`[Migration] Profile '${profile.name}' already exists, using name '${profileName}'`);
      }

      // Create profile with potentially modified name
      const profileToCreate: SiteProfile = {
        ...profile,
        name: profileName
      };

      const id = profileRepo.create(profileToCreate);
      existingNames.add(profileName);

      console.log(`[Migration] Successfully migrated profile '${profileName}' (ID: ${id})`);
      result.profilesMigrated++;
    } catch (error) {
      const errorMsg = `Failed to migrate profile '${profileKey}': ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('[Migration]', errorMsg);
      result.errors.push(errorMsg);
      result.profilesSkipped++;
      result.success = false;
    }
  }

  // Backup JSON file if migration was successful
  if (result.profilesMigrated > 0) {
    try {
      fs.copyFileSync(configPath, backupPath);
      console.log('[Migration] Backed up original config to:', backupPath);
    } catch (error) {
      const errorMsg = `Failed to backup JSON config: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.warn('[Migration]', errorMsg);
      result.errors.push(errorMsg);
      // Don't mark as failure since migration itself succeeded
    }
  }

  // Log summary
  console.log('[Migration] Migration complete:');
  console.log(`[Migration] - Profiles migrated: ${result.profilesMigrated}`);
  console.log(`[Migration] - Profiles skipped: ${result.profilesSkipped}`);
  if (result.errors.length > 0) {
    console.log(`[Migration] - Errors encountered: ${result.errors.length}`);
  }

  return result;
}

/**
 * Validates that a profile has the correct structure and types
 */
function validateProfile(profile: any): profile is SiteProfile {
  try {
    // Check required fields exist
    if (typeof profile.name !== 'string') return false;
    if (typeof profile.categoryUrl !== 'string') return false;

    // Check arrays
    if (!Array.isArray(profile.preActions)) return false;
    if (!Array.isArray(profile.productPageActions)) return false;

    // Check pagination object
    if (!profile.pagination || typeof profile.pagination !== 'object') return false;
    if (!['button', 'infinite', 'url'].includes(profile.pagination.type)) return false;
    if (typeof profile.pagination.maxPages !== 'number') return false;

    // Check field selectors
    if (!profile.fieldSelectors || typeof profile.fieldSelectors !== 'object') return false;

    // Check optional productLinkSelector
    if (profile.productLinkSelector !== undefined && typeof profile.productLinkSelector !== 'string') {
      return false;
    }

    // Check numeric fields with defaults
    if (profile.concurrency !== undefined && typeof profile.concurrency !== 'number') return false;
    if (profile.retries !== undefined && typeof profile.retries !== 'number') return false;
    if (profile.checkpointInterval !== undefined && typeof profile.checkpointInterval !== 'number') return false;

    // Check delayRange
    if (profile.delayRange !== undefined) {
      if (!Array.isArray(profile.delayRange) || profile.delayRange.length !== 2) return false;
      if (typeof profile.delayRange[0] !== 'number' || typeof profile.delayRange[1] !== 'number') return false;
    }

    return true;
  } catch {
    return false;
  }
}
