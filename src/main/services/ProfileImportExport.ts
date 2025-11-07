import { dialog } from 'electron';
import { readFileSync, writeFileSync } from 'fs';
import { ProfileRepository } from '../database/ProfileRepository';
import { ProfileValidator } from '../validation/profileValidator';
import { SiteProfile } from '../../shared/types';
import { ImportResult, ValidationResult } from '../../shared/validation-types';

export class ProfileImportExport {
  constructor(private profileRepo: ProfileRepository) {}

  async exportProfile(profileId: string): Promise<string | null> {
    const profile = this.profileRepo.getById(profileId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    // Show save dialog
    const result = await dialog.showSaveDialog({
      title: 'Export Profile',
      defaultPath: `${profile.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json`,
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (result.canceled || !result.filePath) {
      return null;
    }

    // Serialize profile
    const exportData = this.serializeProfile(profile);
    const json = JSON.stringify(exportData, null, 2);

    // Write file
    writeFileSync(result.filePath, json, 'utf-8');

    return result.filePath;
  }

  async importFromFile(): Promise<ImportResult> {
    // Show open dialog
    const result = await dialog.showOpenDialog({
      title: 'Import Profile',
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, errors: ['Import canceled'] };
    }

    try {
      const json = readFileSync(result.filePaths[0], 'utf-8');
      return this.importFromJSON(json);
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to read file: ${error instanceof Error ? error.message : String(error)}`],
      };
    }
  }

  async importFromURL(url: string): Promise<ImportResult> {
    try {
      // Validate HTTPS
      if (!url.startsWith('https://')) {
        return {
          success: false,
          errors: ['Only HTTPS URLs are allowed for security'],
        };
      }

      // Fetch content
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: false,
            errors: ['Profile not found at this URL. Verify the link is correct.'],
          };
        }
        return {
          success: false,
          errors: [`HTTP ${response.status}: ${response.statusText}`],
        };
      }

      const json = await response.text();
      const result = this.importFromJSON(json, url);

      return result;

    } catch (error) {
      return {
        success: false,
        errors: [`Could not fetch profile from URL: ${error instanceof Error ? error.message : String(error)}`],
      };
    }
  }

  private importFromJSON(json: string, sourceUrl?: string): ImportResult {
    // Validate
    const validation = ProfileValidator.validate(json);

    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors,
        warnings: validation.warnings,
      };
    }

    try {
      const profile = validation.profile as SiteProfile;

      // Set source URL if importing from URL
      if (sourceUrl) {
        profile.sourceUrl = sourceUrl;
      }

      // Set read-only if it's a public profile
      if (profile.isPublic) {
        profile.isReadonly = true;
      }

      // Create profile (new UUID generated in repository)
      const id = this.profileRepo.create(profile);

      return {
        success: true,
        profileId: id,
        warnings: validation.warnings,
      };

    } catch (error) {
      return {
        success: false,
        errors: [`Failed to import profile: ${error instanceof Error ? error.message : String(error)}`],
      };
    }
  }

  private serializeProfile(profile: any): any {
    // Return profile data without internal IDs
    const { id, createdAt, updatedAt, lastSynced, ...exportData } = profile;
    return exportData;
  }

  validateJSON(json: string): ValidationResult {
    return ProfileValidator.validate(json);
  }
}
