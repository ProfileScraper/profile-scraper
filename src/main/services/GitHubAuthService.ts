import { BrowserWindow, shell } from 'electron';
import { Octokit } from '@octokit/rest';
import ElectronStore from 'electron-store';

// GitHub OAuth Application credentials
// IMPORTANT: Create OAuth App at https://github.com/settings/developers
// Set Authorization callback URL to: http://localhost:3000/oauth/callback
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || 'Ov23liHHK0XGfhiIohZi';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || 'dbd27e84bb4c856c613958474023ee7fa8ada935';

// Log to verify credentials loaded (remove in production)
console.log('[GitHubAuth] Client ID loaded:', GITHUB_CLIENT_ID.substring(0, 10) + '...');

interface GitHubUser {
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

interface AuthState {
  token: string | null;
  user: GitHubUser | null;
}

export class GitHubAuthService {
  private store: any; // Using any to avoid type issues with electron-store
  private octokit: Octokit | null = null;

  constructor() {
    this.store = new ElectronStore({
      name: 'github-auth',
      encryptionKey: 'profilescraper-github-encryption-key', // In production, use env var
    });

    // Initialize Octokit if we have a stored token
    const token = this.store.get('token') as string | undefined;
    if (token) {
      this.octokit = new Octokit({ auth: token });
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.store.get('token');
  }

  /**
   * Get current user info
   */
  getUser(): GitHubUser | null {
    return this.store.get('user') as GitHubUser | null;
  }

  /**
   * Get authenticated Octokit instance
   */
  getOctokit(): Octokit | null {
    return this.octokit;
  }

  /**
   * Start OAuth flow - opens GitHub authorization page
   */
  async startOAuthFlow(parentWindow: BrowserWindow): Promise<void> {
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=public_repo&redirect_uri=http://localhost:3000/oauth/callback`;

    // Open in external browser
    await shell.openExternal(authUrl);

    // Note: The callback will be handled by a local server in handleOAuthCallback()
  }

  /**
   * Handle OAuth callback with authorization code
   */
  async handleOAuthCallback(code: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Exchange code for access token
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          client_secret: GITHUB_CLIENT_SECRET,
          code,
        }),
      });

      const tokenData: any = await tokenResponse.json();

      if (tokenData.error) {
        return { success: false, error: tokenData.error_description || tokenData.error };
      }

      const accessToken: string = tokenData.access_token;

      // Initialize Octokit with token
      this.octokit = new Octokit({ auth: accessToken });

      // Fetch user info
      const { data: user } = await this.octokit.users.getAuthenticated();

      // Store token and user
      this.store.set('token', accessToken);
      this.store.set('user', {
        login: user.login,
        name: user.name,
        email: user.email,
        avatar_url: user.avatar_url,
      });

      return { success: true };
    } catch (error) {
      console.error('[GitHubAuth] OAuth callback error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validate stored token
   */
  async validateToken(): Promise<boolean> {
    if (!this.octokit) return false;

    try {
      await this.octokit.users.getAuthenticated();
      return true;
    } catch (error) {
      // Token is invalid, clear it
      this.logout();
      return false;
    }
  }

  /**
   * Logout - clear stored token and user
   */
  logout(): void {
    this.store.clear();
    this.octokit = null;
  }

  /**
   * Set token manually (for testing or if token is obtained differently)
   */
  async setToken(token: string): Promise<{ success: boolean; error?: string }> {
    try {
      this.octokit = new Octokit({ auth: token });

      // Validate token by fetching user
      const { data: user } = await this.octokit.users.getAuthenticated();

      this.store.set('token', token);
      this.store.set('user', {
        login: user.login,
        name: user.name,
        email: user.email,
        avatar_url: user.avatar_url,
      });

      return { success: true };
    } catch (error) {
      this.octokit = null;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Invalid token',
      };
    }
  }
}
