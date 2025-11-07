# GitHub OAuth Setup for Profile Publishing

ProfileScraper uses GitHub OAuth to authenticate users for publishing profiles to the Profile Explorer repository.

## Step 1: Create GitHub OAuth App

1. Go to https://github.com/settings/developers
2. Click **"New OAuth App"**
3. Fill in the application details:

   - **Application name:** `ProfileScraper` (or `ProfileScraper Dev` for development)
   - **Homepage URL:** `https://github.com/ProfileScraper/configurable-scraper`
   - **Application description:** (optional) `Desktop app for web scraping with profile management`
   - **Authorization callback URL:** `http://localhost:3000/oauth/callback`

4. Click **"Register application"**
5. You'll receive:
   - **Client ID** - Make note of this
   - **Client Secret** - Click "Generate a new client secret" and copy it immediately (you won't be able to see it again)

## Step 2: Configure ProfileScraper

### Option A: Environment Variables (Recommended for Development)

Create a `.env` file in the root of your project:

```bash
GITHUB_CLIENT_ID=your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here
```

Add `.env` to your `.gitignore` to prevent committing secrets:

```bash
echo ".env" >> .gitignore
```

Then update your `package.json` scripts to load environment variables:

```json
{
  "scripts": {
    "dev:main": "wait-on http://localhost:5174 && tsc -p tsconfig.main.json && cross-env NODE_ENV=development electron . --require dotenv/config"
  }
}
```

Install dotenv:
```bash
npm install dotenv --save-dev
```

### Option B: Hardcode (Not Recommended)

Edit `src/main/services/GitHubAuthService.ts` and replace:

```typescript
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || 'YOUR_CLIENT_ID_HERE';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || 'YOUR_CLIENT_SECRET_HERE';
```

With your actual credentials:

```typescript
const GITHUB_CLIENT_ID = 'Ov23liAbCdEfGhIjKlMnOp';
const GITHUB_CLIENT_SECRET = '1234567890abcdef1234567890abcdef12345678';
```

**⚠️ WARNING:** Never commit these secrets to version control!

## Step 3: Test OAuth Flow

1. Build and run ProfileScraper:
   ```bash
   npm run dev
   ```

2. Navigate to **Profile Library**
3. Click on any profile
4. Click **"Publish to Profile Explorer"** button
5. Click **"Login with GitHub"**
6. Browser will open with GitHub authorization page
7. Authorize the application
8. You'll be redirected to `localhost:3000/oauth/callback`
9. See success message and return to ProfileScraper
10. You should now be logged in

## Step 4: Production Setup

For production builds, you'll need to:

1. **Use separate OAuth app** for production (different callback URL if needed)
2. **Store secrets securely:**
   - Use environment variables on build machine
   - Or use a secrets management service
   - Or prompt user to configure their own OAuth app (for open source distribution)

3. **Update callback URL** if using different port or custom protocol handler

### Custom Protocol Handler (Advanced)

Instead of `http://localhost:3000/oauth/callback`, you can register a custom protocol like `profilescraper://oauth/callback`:

1. Register protocol in Electron:
   ```typescript
   app.setAsDefaultProtocolClient('profilescraper');
   ```

2. Handle protocol URLs in main process

3. Update GitHub OAuth app callback URL to `profilescraper://oauth/callback`

This approach works better for packaged apps but requires more setup.

## Troubleshooting

### "Not authenticated" Error
- Check that GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are set correctly
- Verify callback URL matches exactly: `http://localhost:3000/oauth/callback`
- Check console logs for specific error messages

### "Failed to create fork" Error
- User needs `public_repo` scope (automatically requested)
- Check network connectivity
- Verify GitHub API is accessible

### Token Storage
- Tokens are stored in: `~/Library/Application Support/ProfileScraper/github-auth.json` (macOS)
- Encrypted using electron-store
- To reset: delete this file and restart app

### OAuth Timeout
- OAuth flow has 5-minute timeout
- If user doesn't authorize within 5 minutes, they'll see timeout error
- Simply try again

## Security Best Practices

1. **Never commit secrets** - Use environment variables or prompt user
2. **Minimal scopes** - Only request `public_repo` scope
3. **Token encryption** - Tokens are encrypted at rest using electron-store
4. **HTTPS only** - Never transmit tokens over unencrypted connections
5. **Token validation** - Tokens are validated on app startup
6. **Logout option** - Users can revoke access anytime

## GitHub Token Scopes

ProfileScraper requests the following OAuth scopes:

- `public_repo` - Access public repositories (required for creating PRs to profile-explorer)

Users can revoke access anytime at: https://github.com/settings/applications

## Need Help?

- [GitHub OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [Octokit.js Documentation](https://github.com/octokit/rest.js)
- [Report Issues](https://github.com/ProfileScraper/configurable-scraper/issues)
