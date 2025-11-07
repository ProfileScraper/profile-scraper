import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import { GitHubAuthService } from '../services/GitHubAuthService';
import { GitHubPublishService } from '../services/GitHubPublishService';
import { OAuthCallbackServer } from '../services/OAuthCallbackServer';

let authService: GitHubAuthService | null = null;
let publishService: GitHubPublishService | null = null;

export function setupGitHubHandlers(mainWindow: BrowserWindow): void {
  // Initialize services
  authService = new GitHubAuthService();
  publishService = new GitHubPublishService(authService);

  // Validate token on startup
  if (authService.isAuthenticated()) {
    authService.validateToken().catch(error => {
      console.error('[GitHub] Token validation failed:', error);
    });
  }

  // Start GitHub OAuth flow
  ipcMain.handle(IPC_CHANNELS.GITHUB_AUTH_START, async () => {
    try {
      if (!authService) {
        return { success: false, error: 'Auth service not initialized' };
      }

      console.log('[IPC] Starting GitHub OAuth flow');

      // Start local server to handle callback
      const callbackServer = new OAuthCallbackServer();
      const codePromise = callbackServer.start();

      // Open GitHub authorization page
      await authService.startOAuthFlow(mainWindow);

      // Wait for callback with code
      const code = await codePromise;

      // Exchange code for token
      const result = await authService.handleOAuthCallback(code);

      if (result.success) {
        const user = authService.getUser();
        return {
          success: true,
          user: {
            login: user?.login,
            name: user?.name,
            avatar_url: user?.avatar_url,
          },
        };
      }

      return result;
    } catch (error) {
      console.error('[IPC] GitHub auth error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Get authentication status
  ipcMain.handle(IPC_CHANNELS.GITHUB_AUTH_STATUS, async () => {
    try {
      if (!authService) {
        return { authenticated: false };
      }

      const authenticated = authService.isAuthenticated();
      const user = authenticated ? authService.getUser() : null;

      return {
        authenticated,
        user: user ? {
          login: user.login,
          name: user.name,
          avatar_url: user.avatar_url,
        } : null,
      };
    } catch (error) {
      console.error('[IPC] Error getting auth status:', error);
      return { authenticated: false };
    }
  });

  // Logout
  ipcMain.handle(IPC_CHANNELS.GITHUB_AUTH_LOGOUT, async () => {
    try {
      if (!authService) {
        return { success: false, error: 'Auth service not initialized' };
      }

      authService.logout();
      return { success: true };
    } catch (error) {
      console.error('[IPC] Logout error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });

  // Get current user
  ipcMain.handle(IPC_CHANNELS.GITHUB_AUTH_GET_USER, async () => {
    try {
      if (!authService) {
        return null;
      }

      const user = authService.getUser();
      if (!user) return null;

      return {
        login: user.login,
        name: user.name,
        avatar_url: user.avatar_url,
      };
    } catch (error) {
      console.error('[IPC] Error getting user:', error);
      return null;
    }
  });

  // Publish profile
  ipcMain.handle(IPC_CHANNELS.GITHUB_PUBLISH_PROFILE, async (_, data) => {
    try {
      if (!publishService) {
        return { success: false, error: 'Publish service not initialized' };
      }

      if (!publishService.canPublish()) {
        return { success: false, error: 'Not authenticated. Please login with GitHub first.' };
      }

      console.log('[IPC] Publishing profile:', data.profile.name);
      const result = await publishService.publishProfile(data);

      return result;
    } catch (error) {
      console.error('[IPC] Error publishing profile:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  });
}
