import { app } from 'electron';
import { logger } from '../logger';

interface GitHubRelease {
  tag_name: string;
  name: string;
  html_url: string;
  published_at: string;
  body: string;
}

export interface UpdateInfo {
  available: boolean;
  currentVersion: string;
  latestVersion?: string;
  releaseUrl?: string;
  releaseNotes?: string;
  publishedAt?: string;
}

export class UpdateChecker {
  private readonly githubRepo = 'ProfileScraper/profile-scraper';
  private readonly apiUrl = `https://api.github.com/repos/${this.githubRepo}/releases/latest`;

  async checkForUpdates(): Promise<UpdateInfo> {
    const currentVersion = app.getVersion();

    try {
      logger.info('[UpdateChecker] Checking for updates...', { currentVersion });

      const response = await fetch(this.apiUrl, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'ProfileScraper'
        }
      });

      if (!response.ok) {
        throw new Error(`GitHub API returned ${response.status}`);
      }

      const release = await response.json() as GitHubRelease;
      const latestVersion = this.normalizeVersion(release.tag_name);
      const currentNormalized = this.normalizeVersion(currentVersion);

      const available = this.isNewerVersion(currentNormalized, latestVersion);

      logger.info('[UpdateChecker] Update check complete', {
        currentVersion: currentNormalized,
        latestVersion,
        available
      });

      return {
        available,
        currentVersion: currentNormalized,
        latestVersion,
        releaseUrl: release.html_url,
        releaseNotes: release.body,
        publishedAt: release.published_at
      };
    } catch (error) {
      logger.error('[UpdateChecker] Failed to check for updates', { error });
      return {
        available: false,
        currentVersion
      };
    }
  }

  private normalizeVersion(version: string): string {
    // Remove 'v' prefix if present
    return version.replace(/^v/, '');
  }

  private isNewerVersion(current: string, latest: string): boolean {
    const currentParts = current.split('.').map(Number);
    const latestParts = latest.split('.').map(Number);

    for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
      const currentPart = currentParts[i] || 0;
      const latestPart = latestParts[i] || 0;

      if (latestPart > currentPart) return true;
      if (latestPart < currentPart) return false;
    }

    return false;
  }
}
