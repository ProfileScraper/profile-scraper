# Profile Sharing & Organization Features - Design Document

**Date:** November 6, 2025
**Status:** Approved
**Author:** Design validated through brainstorming session

## Overview

This document outlines the design for adding profile import/export, public profile marketplace, and domain-based UI grouping to ProfileScraper.

## Goals

1. Enable users to export profiles as JSON files and import them from files or URLs
2. Provide a marketplace for browsing and cloning public community-contributed profiles
3. Organize profiles by domain in the UI for better navigation
4. Support read-only public profiles with clone-to-edit workflow

## Non-Goals (Future Work)

- Profile rating/voting system
- Automated profile update notifications
- Profile publishing API
- Backend moderation system (start with open submission)

## Architecture Decision

**Chosen Approach:** Extended Single Table Architecture

All profiles (user-created, imported, public) stored in the same `profiles` table with new metadata fields. This provides:
- Simple migration path
- Unified queries and UI components
- Clean separation via flags (is_public, is_readonly)
- Minimal complexity increase

## Database Schema Changes

### Extended Profiles Table

New fields added to existing `profiles` table:

```sql
ALTER TABLE profiles ADD COLUMN is_public INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN is_readonly INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN source_profile_id TEXT DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN source_url TEXT DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN author TEXT DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN description TEXT DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN tags TEXT DEFAULT NULL;  -- JSON array
ALTER TABLE profiles ADD COLUMN version TEXT DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN last_synced INTEGER DEFAULT NULL;
```

### Field Descriptions

- **is_public** (boolean): True if profile is from public repository
- **is_readonly** (boolean): True if profile cannot be edited (public profiles)
- **source_profile_id** (UUID): References original profile when cloned
- **source_url** (URL): CDN or GitHub URL where profile was imported from
- **author** (string): Profile creator name for attribution
- **description** (string): What the profile scrapes and why
- **tags** (JSON array): Searchable tags like `["e-commerce", "amazon", "books"]`
- **version** (semver): Profile version (e.g., "1.0.0")
- **last_synced** (timestamp): Last time profile was synced from CDN

### Migration Strategy

- Migration runs on app startup in `src/main/database/db.ts`
- Uses `ALTER TABLE` with `IF NOT EXISTS` checks for safety
- Existing profiles get default values (is_public=0, is_readonly=0, nulls for metadata)
- Backward compatible - no breaking changes to existing functionality

## Public Profile Repository Format

The public marketplace is backed by a static JSON file hosted on CDN/GitHub:

```json
{
  "version": "1.0",
  "updated_at": 1699564800,
  "profiles": [
    {
      "id": "uuid-here",
      "name": "Amazon Books Scraper",
      "author": "community-contributor",
      "description": "Scrapes book listings from Amazon search results",
      "tags": ["e-commerce", "amazon", "books"],
      "version": "1.2.0",
      "created_at": 1699564800,
      "updated_at": 1699564800,
      "categoryUrl": "https://www.amazon.com/s?k=books",
      "preActions": [...],
      "pagination": {...},
      "productLinkSelector": "...",
      "productPageActions": [...],
      "fieldSelectors": {...},
      "concurrency": 3,
      "delayRange": [2000, 4000],
      "retries": 3,
      "checkpointInterval": 10,
      "headless": true,
      "overwriteExisting": false
    }
  ]
}
```

## UI/UX Architecture

### Navigation Structure

```
Sidebar
├── Profiles (existing, enhanced)
├── Marketplace (NEW)
├── Jobs (existing)
└── Help (existing)
```

### New Components

#### 1. Marketplace Component (`src/renderer/components/Marketplace.tsx`)

**Features:**
- Browse all public profiles in grid layout
- Search bar filtering by name, author, domain, tags
- Tag filter chips (multi-select)
- Sort options: name, domain, created date, popularity (future)
- Profile cards show: name, domain, author, description, tags, version
- Click card → Detail view with full description and "Clone" button
- Manual "Refresh" button to sync with CDN
- Empty state: "No public profiles available. Check back soon!"

#### 2. Enhanced Profile Library Component

**New Features:**
- **Import Button**: Opens dialog with two tabs:
  - "Import File" - Native file picker for .json files
  - "Import URL" - Text input for GitHub raw URLs or CDN links
- **View Toggle**: Switch between "Grid View" and "Grouped by Domain"
- **Export Button**: On each profile card (user profiles only)
- **Origin Badges**: Cloned profiles show "Cloned from: [author/name]"
- **Read-only Indicators**: Lock icon on public profiles, disabled Edit button

**Domain Grouping View:**
```
amazon.com (3 profiles) [collapse/expand]
├── Amazon Books
├── Amazon Electronics
└── Amazon Fashion

walmart.com (2 profiles) [collapse/expand]
├── Walmart Groceries
└── Walmart Tech
```

Grouping logic:
- Extract domain from `categoryUrl` using existing `getDomain()` utility
- Sort domains alphabetically
- Within each domain, sort profiles by `created_at` descending
- Persist collapse/expand state per domain in localStorage
- Persist view preference (grid vs grouped) in localStorage

#### 3. Import/Export Dialogs

**Export Dialog:**
- Shows profile name
- Warning message: "This export may contain site-specific selectors. Review before sharing publicly."
- "Download JSON" button
- Uses Electron `dialog.showSaveDialog()` with default filename: `{profile-name}.json`

**Import Preview Dialog:**
- Shows profile name, domain, author, description
- Validation results (success/errors)
- "Import" button (disabled if validation fails)
- For URL imports, shows source URL

### Updated ProfileBuilder Behavior

- Detects `is_readonly=true` and shows banner: "This is a public profile. Clone it to make changes."
- All form fields disabled in read-only mode
- Save/Update buttons hidden
- "Clone Profile" button prominent

## Data Flows

### Profile Export

```
1. User clicks "Export" on ProfileCard
2. Export dialog opens with warning
3. User confirms
4. ProfileRepository.getById(id) fetches full profile
5. Serialize to JSON (all fields including metadata)
6. dialog.showSaveDialog() prompts for filename
7. Write JSON to selected file path
```

### Profile Import (File)

```
1. User clicks "Import" → "Import File" tab
2. Native file picker opens
3. User selects .json file
4. Read file contents
5. Validate JSON schema
   - Check required fields exist
   - Validate data types
   - Warn on malformed selectors
6. Show preview dialog with profile details
7. User confirms
8. Generate new UUID
9. Set is_readonly=true if is_public=true in JSON
10. ProfileRepository.create(profile)
11. Navigate to Profile Library
```

### Profile Import (URL)

```
1. User clicks "Import" → "Import URL" tab
2. Modal with text input appears
3. User pastes URL (e.g., GitHub raw link)
4. Fetch URL content via main process (bypass CORS)
5. Same validation as file import
6. Store source_url in profile
7. ProfileRepository.create(profile)
8. Navigate to Profile Library
```

### Marketplace Sync

```
1. App startup OR user clicks "Refresh" in Marketplace
2. Fetch https://your-cdn-url.com/public-profiles.json
3. Parse JSON and validate schema
4. For each profile in response:
   a. Check if exists locally (by id)
   b. If new: Insert with is_public=true, is_readonly=true
   c. If exists and remote updated_at > last_synced:
      - Update fields (preserve local id)
      - Update last_synced timestamp
5. Handle errors gracefully:
   - Network failure: Use cached profiles, show warning
   - Invalid JSON: Log error, don't clear existing
   - Individual profile validation fails: Skip it, continue with others
```

### Clone Profile

```
1. User clicks "Clone" button on read-only profile
2. ProfileRepository.getById(sourceId) fetches source profile
3. Create new profile object:
   - Generate new UUID
   - Copy all scraping configuration
   - name = source.name + " (Copy)"
   - source_profile_id = source.id
   - is_readonly = false
   - is_public = false
   - metadata copied (author, description, tags, version)
4. ProfileRepository.create(newProfile)
5. Navigate to /profiles/:newId/edit (ProfileBuilder in edit mode)
```

## Validation & Error Handling

### Import Validation

**Schema Validation:**
- Required fields: name, categoryUrl, fieldSelectors, pagination
- Type checks: arrays are arrays, objects are objects
- Bounds: concurrency > 0, delays > 0, retries >= 0

**Selector Validation:**
- Warn (don't block) if selectors look malformed
- Check for common CSS selector patterns
- Suggest corrections for obvious typos

**Version Compatibility:**
- Check profile schema version if present
- Warn if profile from newer app version
- Block import if critical incompatibility detected

**Error Messages:**
```
✓ "Invalid profile: missing required field 'categoryUrl'"
✗ "JSON parse error at line 47"
```

### URL Import Error Handling

| Error | Message |
|-------|---------|
| Network failure | "Could not fetch profile from URL. Check your connection and try again." |
| 404 | "Profile not found at this URL. Verify the link is correct." |
| Invalid JSON | "URL content is not valid JSON. Ensure the link points to a raw JSON file." |
| Timeout | "Request timed out. Try again or download the file manually." |

**Implementation:** Fetch via main process using node `https` module to bypass CORS.

### Marketplace Sync Errors

- **Network failure**: Show warning toast, continue with cached profiles
- **Invalid CDN JSON**: Log error to console, don't clear existing public profiles
- **Partial validation failures**: Skip invalid profiles, import valid ones
- **Retry logic**: Exponential backoff for transient errors (3 retries max)

### Read-only Enforcement

**UI Layer:**
- ProfileBuilder shows read-only banner
- Edit button disabled on profile cards
- All form inputs disabled

**Repository Layer:**
- `ProfileRepository.update()` checks `is_readonly` flag
- Throws error if attempting to update read-only profile
- Prevents accidental modification via IPC

## IPC API Changes

### New Channels

```typescript
// Import/Export
'profile:export' - (id: string) => Promise<ProfileJSON>
'profile:import-file' - (filePath: string) => Promise<ImportResult>
'profile:import-url' - (url: string) => Promise<ImportResult>
'profile:import-validate' - (json: string) => Promise<ValidationResult>

// Marketplace
'marketplace:sync' - () => Promise<SyncResult>
'marketplace:get-all' - () => Promise<PublicProfile[]>

// Clone
'profile:clone' - (sourceId: string) => Promise<string> // returns new ID
```

### Updated Types

```typescript
interface ImportResult {
  success: boolean;
  profileId?: string;
  errors?: string[];
  warnings?: string[];
}

interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
  profile?: SiteProfile;
}

interface SyncResult {
  success: boolean;
  profilesAdded: number;
  profilesUpdated: number;
  errors?: string[];
}
```

## Testing Strategy

### Unit Tests

- `ProfileRepository`: CRUD with new metadata fields
- Import validation logic (schema, types, selectors)
- Export serialization (includes all fields, proper JSON)
- Domain extraction and grouping logic

### Integration Tests

- Full import flow (file → validation → database)
- URL import with mock fetch
- Marketplace sync with mock CDN response
- Clone operation (source → new profile)
- Read-only enforcement (attempt update → error)

### Manual Testing Checklist

```
□ Export profile → Import in fresh database → Verify all fields preserved
□ Import from GitHub raw URL → Verify source_url stored
□ Sync marketplace → Verify public profiles appear
□ Clone public profile → Edit clone → Verify source tracking
□ Attempt to edit public profile → Verify blocked with message
□ Domain grouping → Collapse/expand → Refresh page → Verify state persisted
□ Import invalid JSON → Verify user-friendly error message
□ Network failure during sync → Verify graceful fallback
```

## Performance Considerations

- **Domain Grouping**: Computed client-side, acceptable for <1000 profiles
- **Marketplace Sync**: Once per app session (not on every tab switch)
- **CDN Caching**: Respect Cache-Control headers to minimize requests
- **Local Queries**: Use existing indexes on id and created_at
- **Search Filtering**: Client-side filtering acceptable for MVP

## Security Considerations

- **URL Imports**: Only allow HTTPS sources
- **JSON Parsing**: Wrapped in try-catch to prevent crashes
- **No Code Execution**: Profiles are pure data (JSON), not executable
- **Selector Injection**: Selectors passed to Patchright's API (already sanitized)
- **Future**: Content Security Policy for profile preview iframes

## Migration Path

### For Existing Users

1. App updates with new version
2. Database migration runs on startup
3. Existing profiles get default values (is_public=0, is_readonly=0)
4. UI shows new Import button and Marketplace tab
5. Zero breaking changes to existing workflows

### For New Users

1. Fresh install includes all features
2. Marketplace pre-populated with public profiles on first sync
3. Can import profiles immediately

## Future Enhancements

**Phase 2 (Post-MVP):**
- Profile ratings and community voting
- Update notifications when source profile has new version
- Bulk import (multiple profiles from folder)
- Profile collections/bundles

**Phase 3 (Long-term):**
- Profile publishing workflow (submit to public repository)
- Advanced search (full-text, semantic tags)
- Profile analytics (download count, success rate)
- Profile versioning and rollback

## Open Questions

None - all design questions resolved during brainstorming session.

## Approval

Design validated through structured brainstorming session. Ready for implementation planning.
