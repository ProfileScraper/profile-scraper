# Profile Publishing Architecture

## Overview

Allow users to publish profiles to Profile Explorer with GitHub authentication.

## Architecture Options

### Option A: Direct PR Creation (Recommended - Simpler)

**Flow:**
1. User clicks "Publish to Profile Explorer" in ProfileScraper
2. App initiates GitHub OAuth flow
3. User authenticates with GitHub
4. App receives access token
5. App uses GitHub API to fork repo (if needed) and create PR
6. Auto-populate: `author` = GitHub username, `created_at` = current timestamp
7. You review and merge PR on GitHub

**Pros:**
- No backend infrastructure needed
- GitHub handles authentication
- Native PR review workflow
- Free (uses GitHub's infrastructure)

**Cons:**
- Users see OAuth permission prompt
- Requires GitHub account
- PRs need manual review

**Implementation:**
- Add `electron-oauth2` or custom OAuth flow
- Use GitHub REST API v3 to create PR
- Store token securely in Electron's keychain

---

### Option B: API Gateway with Backend Service

**Flow:**
1. User clicks "Publish to Profile Explorer"
2. App initiates OAuth with your backend
3. Backend handles GitHub authentication
4. Profile submitted to backend API
5. Backend validates and stores in database
6. Admin reviews in dashboard
7. Approved profiles added to public-profiles.json

**Pros:**
- More control over submission process
- Can add moderation queue
- Can implement abuse prevention
- Better UX (no PR interface)

**Cons:**
- Requires backend infrastructure (hosting costs)
- Requires database
- Requires admin dashboard
- More maintenance

**Implementation:**
- Backend: Express.js API on Vercel/Railway/Fly.io
- Database: PostgreSQL or MongoDB for submissions
- Admin: Simple dashboard to review/approve
- GitHub API: Automated PR/commit when approved

---

### Option C: GitHub App (Advanced)

Create a GitHub App that handles submissions through GitHub Issues or Discussions.

**Flow:**
1. User authenticates with GitHub
2. Profile submitted as GitHub Issue with special format
3. GitHub Actions validate and process
4. Approved submissions automatically merged

**Pros:**
- Uses GitHub infrastructure
- No separate backend
- Public submission history

**Cons:**
- Complex GitHub Actions setup
- Less flexible validation
- Submissions visible as Issues

---

## Recommended Approach: Option A (Direct PR)

For your use case, I recommend **Option A** because:
- No backend maintenance
- Leverages GitHub's existing features
- Simple to implement
- Free infrastructure

## Implementation Plan for Option A

### 1. Register GitHub OAuth App

Create OAuth app at: https://github.com/settings/developers

**Settings:**
- Application name: ProfileScraper
- Homepage URL: https://github.com/ProfileScraper/configurable-scraper
- Authorization callback URL: `profilescraper://oauth/callback`
- Note: Client ID and Client Secret needed

### 2. Add OAuth to Electron App

**Dependencies:**
```bash
npm install @octokit/rest
```

**OAuth Flow:**
```typescript
// src/main/services/GitHubAuthService.ts
- Handle OAuth flow with custom protocol handler
- Exchange code for access token
- Store token securely (electron-store with encryption)
- Validate token on startup
```

### 3. GitHub API Integration

**Service:**
```typescript
// src/main/services/GitHubPublishService.ts
- Fork ProfileScraper/profile-explorer (if not already forked)
- Create branch with profile changes
- Commit profile to public-profiles.json
- Create pull request
```

### 4. UI Changes

**Add "Publish" Button:**
- Profile Library: "Publish to Explorer" button
- Shows only for non-public, non-readonly profiles
- Opens publish dialog

**Publish Dialog:**
```
┌─────────────────────────────────────┐
│ Publish to Profile Explorer         │
├─────────────────────────────────────┤
│ Profile: My Profile Name            │
│                                     │
│ [✓] Logged in as: username          │
│ [ ] Not logged in - Login with     │
│     GitHub                          │
│                                     │
│ Description:                        │
│ ┌─────────────────────────────────┐ │
│ │ [Text area for description]     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Tags: [e-commerce] [x]             │
│       [+] Add tag                   │
│                                     │
│ Auto-populated:                    │
│ • Author: username                  │
│ • Created: 2024-11-07              │
│                                     │
│ [ Cancel ]  [ Create Pull Request ] │
└─────────────────────────────────────┘
```

### 5. Security Considerations

**Token Storage:**
- Use electron-store with encryption
- Never expose token in logs/UI
- Clear token on logout

**Validation:**
- Validate profile before submitting
- Check for sensitive data (API keys, passwords)
- Warn about URLs that might have auth tokens

**Scope:**
- Request minimal GitHub scopes: `public_repo`
- Explain permissions clearly to user

### 6. Auto-populated Fields

From GitHub:
- `author`: GitHub username
- `created_at`: Current Unix timestamp

From Profile:
- `id`: Generate new UUID
- `isPublic`: true
- `isReadonly`: true (in the PR, not locally)
- `version`: "1.0.0"
- `updated_at`: Same as created_at

User Provides:
- `description`: Required field
- `tags`: Required (at least one)

## Alternative: Start Even Simpler

**Manual Export + Template:**
1. Add "Export for Publishing" feature
2. Generates profile JSON with template instructions
3. User manually creates PR on GitHub
4. Instructions guide them through process

This requires no OAuth but provides a path to publishing.

## Next Steps

Choose implementation approach:
1. **Recommended:** Implement Option A (Direct PR)
2. **Simpler:** Manual export with instructions
3. **Advanced:** Build API Gateway (Option B)

Would you like me to proceed with implementing Option A?
