# Profile Explorer Repository Setup

Your ProfileScraper app is now configured to sync with:
```
https://github.com/ProfileScraper/profile-explorer
```

## Setup Steps

### 1. Initialize the Repository

In your profile-explorer repository, create the public profiles file:

```bash
# Clone your repository
git clone https://github.com/ProfileScraper/profile-explorer.git
cd profile-explorer

# Copy the template file
cp path/to/public-profiles.json.template public-profiles.json

# Edit public-profiles.json to add real profiles
# Or start with the empty structure below
```

### 2. Minimal public-profiles.json Structure

If you want to start with an empty profile list:

```json
{
  "version": "1.0.0",
  "updated_at": 1730937600000,
  "profiles": []
}
```

**Note:** Update `updated_at` to the current Unix timestamp in milliseconds when you modify the file.

### 3. Commit and Push

```bash
git add public-profiles.json
git commit -m "Add public profiles structure"
git push origin main
```

### 4. Test Sync in ProfileScraper

1. Open ProfileScraper app
2. Navigate to **Profile Explorer** tab
3. Click **Refresh** button
4. Check the console/logs for sync results

The app will fetch from:
```
https://raw.githubusercontent.com/ProfileScraper/profile-explorer/main/public-profiles.json
```

## Adding Profiles

### Option 1: Export from ProfileScraper

1. Create and test a profile in ProfileScraper
2. Click **Export** on the profile
3. Open the exported JSON file
4. Copy the profile data (add required fields like `isPublic`, `isReadonly`, `tags`, `author`, `description`)
5. Add to the `profiles` array in `public-profiles.json`
6. Update `updated_at` timestamp
7. Commit and push

### Option 2: Manual Creation

Follow the structure in `public-profiles.json.template`:

```json
{
  "id": "unique-id-here",           // Use UUID v4 format
  "name": "Site - Category",
  "description": "What it scrapes",
  "author": "Your Name",
  "tags": ["e-commerce"],
  "categoryUrl": "...",
  "productLinkSelector": "...",
  "fieldSelectors": { ... },
  "pagination": { ... },
  "preActions": [],
  "productPageActions": [],
  "concurrency": 3,
  "delayRange": [2000, 4000],
  "retries": 3,
  "checkpointInterval": 10,
  "headless": true,
  "overwriteExisting": false,
  "isPublic": true,
  "isReadonly": true,
  "version": "1.0.0",
  "created_at": 1730937600000,    // Unix timestamp (ms)
  "updated_at": 1730937600000     // Unix timestamp (ms)
}
```

### Required Fields for Public Profiles

- `isPublic: true` - Marks as public profile
- `isReadonly: true` - Prevents editing in app (users must clone)
- `tags: [...]` - For filtering in Profile Explorer
- `author: "..."` - Credits the contributor
- `description: "..."` - Explains what the profile does
- `version: "1.0.0"` - Profile version

## Getting Unix Timestamps

In browser console or Node.js:
```javascript
Date.now()  // Returns current timestamp in milliseconds
```

Or use online tools: https://www.unixtimestamp.com/

## Profile Validation

ProfileScraper validates profiles on sync. Common errors:

- Missing required fields (`name`, `categoryUrl`, etc.)
- Invalid pagination type (must be `button`, `infinite`, or `url`)
- Invalid action types
- Malformed JSON

Check the app console for validation error details.

## Repository Structure

```
profile-explorer/
├── README.md                    # Repository documentation
├── public-profiles.json         # The main profiles file
├── CONTRIBUTING.md             # Contribution guidelines (optional)
└── examples/                   # Example profiles (optional)
    └── example-store.json
```

## CDN Caching

GitHub raw files are cached by CDN. If changes don't appear immediately:

1. Wait a few minutes for cache to clear
2. Add a cache-busting parameter (app doesn't support this yet)
3. Check the raw URL directly in browser to verify content

## Need Help?

- [ProfileScraper Docs](https://github.com/ProfileScraper/configurable-scraper)
- [Report Issues](https://github.com/ProfileScraper/profile-explorer/issues)
