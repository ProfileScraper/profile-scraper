import { Octokit } from '@octokit/rest';
import { GitHubAuthService } from './GitHubAuthService';
import { SiteProfile } from '../../shared/types';
import { v4 as uuidv4 } from 'uuid';

const REPO_OWNER = 'ProfileScraper';
const REPO_NAME = 'profile-explorer';
const PROFILES_FILE_PATH = 'public-profiles.json';

export interface PublishProfileData {
  profile: SiteProfile;
  description: string;
  tags: string[];
}

export interface PublishResult {
  success: boolean;
  prUrl?: string;
  error?: string;
}

export class GitHubPublishService {
  constructor(private authService: GitHubAuthService) {}

  /**
   * Publish a profile by creating a PR to the profile-explorer repository
   */
  async publishProfile(data: PublishProfileData): Promise<PublishResult> {
    const octokit = this.authService.getOctokit();
    const user = this.authService.getUser();

    if (!octokit || !user) {
      return { success: false, error: 'Not authenticated with GitHub' };
    }

    try {
      // 1. Check if user has already forked the repo
      let forkOwner = user.login;
      let hasFork = false;

      try {
        await octokit.repos.get({
          owner: forkOwner,
          repo: REPO_NAME,
        });
        hasFork = true;
        console.log('[GitHubPublish] User already has fork');
      } catch (error: any) {
        if (error.status === 404) {
          console.log('[GitHubPublish] Fork not found, will create');
        } else {
          throw error;
        }
      }

      // 2. Fork the repository if needed
      if (!hasFork) {
        console.log('[GitHubPublish] Forking repository...');
        const forkResponse = await octokit.repos.createFork({
          owner: REPO_OWNER,
          repo: REPO_NAME,
        });

        // Wait a bit for fork to be ready
        await new Promise(resolve => setTimeout(resolve, 3000));
        console.log('[GitHubPublish] Fork created');
      }

      // 3. Get repository info to find default branch
      console.log('[GitHubPublish] Getting repository info...');
      const { data: repoInfo } = await octokit.repos.get({
        owner: REPO_OWNER,
        repo: REPO_NAME,
      });
      const defaultBranch = repoInfo.default_branch;
      console.log(`[GitHubPublish] Default branch: ${defaultBranch}`);

      // 4. Sync fork with upstream to avoid merge conflicts
      if (hasFork) {
        console.log('[GitHubPublish] Syncing fork with upstream...');
        try {
          // Try to sync fork using the merge-upstream API
          await octokit.repos.mergeUpstream({
            owner: forkOwner,
            repo: REPO_NAME,
            branch: defaultBranch,
          });
          console.log('[GitHubPublish] Fork synced successfully');
          // Wait a moment for sync to propagate
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error: any) {
          // Sync might fail if fork is already up to date or has conflicts
          // This is not critical, we'll continue
          console.log('[GitHubPublish] Fork sync status:', error.message);
        }
      }

      // 5. Get the current public-profiles.json from default branch
      console.log('[GitHubPublish] Fetching current profiles file...');
      let currentContent: any;
      let currentSha: string;

      try {
        const fileResponse = await octokit.repos.getContent({
          owner: REPO_OWNER,
          repo: REPO_NAME,
          path: PROFILES_FILE_PATH,
          ref: defaultBranch,
        });

        if ('content' in fileResponse.data) {
          const content = Buffer.from(fileResponse.data.content, 'base64').toString('utf-8');
          currentContent = JSON.parse(content);
          currentSha = fileResponse.data.sha;
        } else {
          throw new Error('Expected file, got directory');
        }
      } catch (error: any) {
        if (error.status === 404) {
          // File doesn't exist yet, create empty structure
          currentContent = {
            version: '1.0.0',
            updated_at: Date.now(),
            profiles: [],
          };
          currentSha = '';
        } else {
          throw error;
        }
      }

      // 6. Prepare the new profile data
      const publishProfile = {
        ...data.profile,
        id: uuidv4(),
        author: user.login,
        description: data.description,
        tags: data.tags,
        isPublic: true,
        isReadonly: true,
        version: '1.0.0',
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      // Remove metadata fields that shouldn't be in public profiles
      delete (publishProfile as any).sourceProfileId;
      delete (publishProfile as any).sourceUrl;
      delete (publishProfile as any).lastSynced;

      // 7. Add profile to profiles array
      currentContent.profiles.push(publishProfile);
      currentContent.updated_at = Date.now();

      const newContent = JSON.stringify(currentContent, null, 2);

      // 8. Create a new branch in user's fork
      const branchName = `add-profile-${publishProfile.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;
      console.log(`[GitHubPublish] Creating branch: ${branchName}`);

      // Get the default branch ref from fork
      const { data: mainRef } = await octokit.git.getRef({
        owner: forkOwner,
        repo: REPO_NAME,
        ref: `heads/${defaultBranch}`,
      });

      // Create new branch
      await octokit.git.createRef({
        owner: forkOwner,
        repo: REPO_NAME,
        ref: `refs/heads/${branchName}`,
        sha: mainRef.object.sha,
      });

      // 9. Get the SHA of the file in the fork's new branch (if it exists)
      let forkFileSha: string | undefined;
      try {
        const forkFileResponse = await octokit.repos.getContent({
          owner: forkOwner,
          repo: REPO_NAME,
          path: PROFILES_FILE_PATH,
          ref: branchName,
        });

        if ('content' in forkFileResponse.data) {
          forkFileSha = forkFileResponse.data.sha;
        }
      } catch (error: any) {
        // File doesn't exist in fork branch yet, that's okay
        if (error.status !== 404) {
          throw error;
        }
      }

      // 10. Commit the changes to the new branch
      console.log('[GitHubPublish] Committing changes...');
      await octokit.repos.createOrUpdateFileContents({
        owner: forkOwner,
        repo: REPO_NAME,
        path: PROFILES_FILE_PATH,
        message: `Add profile: ${publishProfile.name}`,
        content: Buffer.from(newContent).toString('base64'),
        branch: branchName,
        sha: forkFileSha,
      });

      // 11. Create pull request
      console.log('[GitHubPublish] Creating pull request...');
      const prTitle = `Add profile: ${publishProfile.name}`;
      const prBody = `## New Profile Submission

**Profile Name:** ${publishProfile.name}
**Author:** @${user.login}
**Description:** ${data.description}
**Tags:** ${data.tags.join(', ')}

### Profile Details
- **Category URL:** ${publishProfile.categoryUrl}
- **Concurrency:** ${publishProfile.concurrency}
- **Fields:** ${Object.keys(publishProfile.fieldSelectors).join(', ')}
- **Pagination Type:** ${publishProfile.pagination.type}

---
*This profile was submitted via ProfileScraper desktop app.*`;

      const { data: pr } = await octokit.pulls.create({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        title: prTitle,
        body: prBody,
        head: `${forkOwner}:${branchName}`,
        base: defaultBranch,
      });

      console.log(`[GitHubPublish] PR created: ${pr.html_url}`);

      return {
        success: true,
        prUrl: pr.html_url,
      };
    } catch (error) {
      console.error('[GitHubPublish] Error publishing profile:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Check if user has permission to publish (i.e., is authenticated)
   */
  canPublish(): boolean {
    return this.authService.isAuthenticated();
  }
}
