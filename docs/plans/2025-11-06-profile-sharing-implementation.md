# Profile Sharing & Organization Features - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add profile import/export, public marketplace, and domain-based UI grouping to ProfileScraper.

**Architecture:** Extended single-table design with new metadata fields in profiles table. Static JSON CDN for public profiles. Hybrid file/URL import with read-only enforcement and clone-to-edit workflow.

**Tech Stack:** TypeScript, SQLite (DatabaseSync), React 19, Zustand, Electron IPC, Tailwind CSS

---

## PHASE 1: Database Schema Extension

### Task 1.1: Add Database Migration for New Profile Fields

**Files:**
- Modify: `src/main/database/db.ts` (migration section)
- Modify: `src/main/database/schema.ts`
- Modify: `src/shared/types.ts`

**Step 1: Read current database initialization**

Read `src/main/database/db.ts` to understand migration pattern.

**Step 2: Add migration for new columns**

In `src/main/database/db.ts`, add after existing migrations:

```typescript
// Migration 3: Add profile sharing metadata fields
const migration3 = `
  ALTER TABLE profiles ADD COLUMN is_public INTEGER DEFAULT 0;
  ALTER TABLE profiles ADD COLUMN is_readonly INTEGER DEFAULT 0;
  ALTER TABLE profiles ADD COLUMN source_profile_id TEXT DEFAULT NULL;
  ALTER TABLE profiles ADD COLUMN source_url TEXT DEFAULT NULL;
  ALTER TABLE profiles ADD COLUMN author TEXT DEFAULT NULL;
  ALTER TABLE profiles ADD COLUMN description TEXT DEFAULT NULL;
  ALTER TABLE profiles ADD COLUMN tags TEXT DEFAULT NULL;
  ALTER TABLE profiles ADD COLUMN version TEXT DEFAULT NULL;
  ALTER TABLE profiles ADD COLUMN last_synced INTEGER DEFAULT NULL;
`;

// Add to migrations array or version check
```

**Step 3: Update schema.ts with new fields**

In `src/main/database/schema.ts`, update profiles table schema:

```typescript
export const PROFILES_TABLE = `
  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    category_url TEXT NOT NULL,
    pre_actions TEXT,
    pagination TEXT NOT NULL,
    product_link_selector TEXT,
    prepend_domain INTEGER DEFAULT 0,
    product_page_actions TEXT,
    field_selectors TEXT,
    concurrency INTEGER DEFAULT 3,
    delay_min INTEGER DEFAULT 2000,
    delay_max INTEGER DEFAULT 4000,
    retries INTEGER DEFAULT 3,
    checkpoint_interval INTEGER DEFAULT 10,
    headless INTEGER DEFAULT 1,
    overwrite_existing INTEGER DEFAULT 0,
    is_public INTEGER DEFAULT 0,
    is_readonly INTEGER DEFAULT 0,
    source_profile_id TEXT DEFAULT NULL,
    source_url TEXT DEFAULT NULL,
    author TEXT DEFAULT NULL,
    description TEXT DEFAULT NULL,
    tags TEXT DEFAULT NULL,
    version TEXT DEFAULT NULL,
    last_synced INTEGER DEFAULT NULL
  )
`;
```

**Step 4: Update TypeScript types**

In `src/shared/types.ts`, extend SiteProfile interface:

```typescript
export interface SiteProfile {
  // Existing fields
  name: string;
  categoryUrl: string;
  preActions: Action[];
  pagination: PaginationConfig;
  productLinkSelector?: string;
  prependDomain?: boolean;
  productPageActions: Action[];
  fieldSelectors: Record<string, string | FieldSelector>;
  concurrency: number;
  delayRange: [number, number];
  retries: number;
  checkpointInterval: number;
  headless?: boolean;
  overwriteExisting?: boolean;

  // New metadata fields
  isPublic?: boolean;
  isReadonly?: boolean;
  sourceProfileId?: string;
  sourceUrl?: string;
  author?: string;
  description?: string;
  tags?: string[];
  version?: string;
  lastSynced?: number;
}

export interface ProfileMetadata {
  id: string;
  created_at: number;
  updated_at: number;
}

export type ProfileWithMetadata = SiteProfile & ProfileMetadata;
```

**Step 5: Test migration**

Run: `npm run dev`
Expected: App starts, migration runs, no errors in console

**Step 6: Verify database schema**

Use SQLite CLI or DB viewer to check profiles table has new columns.

**Step 7: Commit**

```bash
git add src/main/database/db.ts src/main/database/schema.ts src/shared/types.ts
git commit -m "feat: add profile sharing metadata fields to database schema"
```

---

### Task 1.2: Update ProfileRepository for New Fields

**Files:**
- Modify: `src/main/database/ProfileRepository.ts`

**Step 1: Read ProfileRepository implementation**

Read `src/main/database/ProfileRepository.ts` to understand CRUD pattern.

**Step 2: Update create method to handle new fields**

```typescript
create(profile: SiteProfile): string {
  const id = crypto.randomUUID();
  const now = Date.now();

  const stmt = this.db.prepare(`
    INSERT INTO profiles (
      id, name, created_at, updated_at, category_url,
      pre_actions, pagination, product_link_selector, prepend_domain,
      product_page_actions, field_selectors, concurrency,
      delay_min, delay_max, retries, checkpoint_interval,
      headless, overwrite_existing,
      is_public, is_readonly, source_profile_id, source_url,
      author, description, tags, version, last_synced
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    profile.name,
    now,
    now,
    profile.categoryUrl,
    JSON.stringify(profile.preActions || []),
    JSON.stringify(profile.pagination),
    profile.productLinkSelector || null,
    profile.prependDomain ? 1 : 0,
    JSON.stringify(profile.productPageActions || []),
    JSON.stringify(profile.fieldSelectors),
    profile.concurrency,
    profile.delayRange[0],
    profile.delayRange[1],
    profile.retries,
    profile.checkpointInterval,
    profile.headless ? 1 : 0,
    profile.overwriteExisting ? 1 : 0,
    profile.isPublic ? 1 : 0,
    profile.isReadonly ? 1 : 0,
    profile.sourceProfileId || null,
    profile.sourceUrl || null,
    profile.author || null,
    profile.description || null,
    profile.tags ? JSON.stringify(profile.tags) : null,
    profile.version || null,
    profile.lastSynced || null
  );

  return id;
}
```

**Step 3: Update getById to deserialize new fields**

```typescript
getById(id: string): ProfileWithMetadata | null {
  const stmt = this.db.prepare('SELECT * FROM profiles WHERE id = ?');
  const row = stmt.get(id) as any;

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    created_at: row.created_at,
    updated_at: row.updated_at,
    categoryUrl: row.category_url,
    preActions: JSON.parse(row.pre_actions || '[]'),
    pagination: JSON.parse(row.pagination),
    productLinkSelector: row.product_link_selector,
    prependDomain: Boolean(row.prepend_domain),
    productPageActions: JSON.parse(row.product_page_actions || '[]'),
    fieldSelectors: JSON.parse(row.field_selectors),
    concurrency: row.concurrency,
    delayRange: [row.delay_min, row.delay_max],
    retries: row.retries,
    checkpointInterval: row.checkpoint_interval,
    headless: Boolean(row.headless),
    overwriteExisting: Boolean(row.overwrite_existing),
    isPublic: Boolean(row.is_public),
    isReadonly: Boolean(row.is_readonly),
    sourceProfileId: row.source_profile_id,
    sourceUrl: row.source_url,
    author: row.author,
    description: row.description,
    tags: row.tags ? JSON.parse(row.tags) : undefined,
    version: row.version,
    lastSynced: row.last_synced,
  };
}
```

**Step 4: Update getAll similarly**

Apply same deserialization logic to `getAll()` method.

**Step 5: Update update method**

```typescript
update(id: string, profile: SiteProfile): void {
  // Check if profile is read-only
  const existing = this.getById(id);
  if (existing?.isReadonly) {
    throw new Error('Cannot update read-only profile. Clone it first.');
  }

  const now = Date.now();

  const stmt = this.db.prepare(`
    UPDATE profiles SET
      name = ?, updated_at = ?, category_url = ?,
      pre_actions = ?, pagination = ?, product_link_selector = ?,
      prepend_domain = ?, product_page_actions = ?, field_selectors = ?,
      concurrency = ?, delay_min = ?, delay_max = ?,
      retries = ?, checkpoint_interval = ?, headless = ?,
      overwrite_existing = ?,
      author = ?, description = ?, tags = ?, version = ?
    WHERE id = ?
  `);

  stmt.run(
    profile.name,
    now,
    profile.categoryUrl,
    JSON.stringify(profile.preActions || []),
    JSON.stringify(profile.pagination),
    profile.productLinkSelector || null,
    profile.prependDomain ? 1 : 0,
    JSON.stringify(profile.productPageActions || []),
    JSON.stringify(profile.fieldSelectors),
    profile.concurrency,
    profile.delayRange[0],
    profile.delayRange[1],
    profile.retries,
    profile.checkpointInterval,
    profile.headless ? 1 : 0,
    profile.overwriteExisting ? 1 : 0,
    profile.author || null,
    profile.description || null,
    profile.tags ? JSON.stringify(profile.tags) : null,
    profile.version || null,
    id
  );
}
```

**Step 6: Test repository methods**

Run: `npm run dev`
Create a test profile, verify new fields are saved/loaded correctly.

**Step 7: Commit**

```bash
git add src/main/database/ProfileRepository.ts
git commit -m "feat: update ProfileRepository to handle metadata fields"
```

---

## PHASE 2: Import/Export Foundation

### Task 2.1: Create Profile Validation Utility

**Files:**
- Create: `src/main/validation/profileValidator.ts`
- Create: `src/shared/validation-types.ts`

**Step 1: Define validation types**

Create `src/shared/validation-types.ts`:

```typescript
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  profile?: any;
}

export interface ImportResult {
  success: boolean;
  profileId?: string;
  errors?: string[];
  warnings?: string[];
}
```

**Step 2: Create validator utility**

Create `src/main/validation/profileValidator.ts`:

```typescript
import { ValidationResult } from '../../shared/validation-types';

export class ProfileValidator {
  static validate(json: string): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    };

    try {
      const profile = JSON.parse(json);
      result.profile = profile;

      // Required fields
      if (!profile.name) result.errors.push("Missing required field 'name'");
      if (!profile.categoryUrl) result.errors.push("Missing required field 'categoryUrl'");
      if (!profile.fieldSelectors) result.errors.push("Missing required field 'fieldSelectors'");
      if (!profile.pagination) result.errors.push("Missing required field 'pagination'");

      // Type validation
      if (profile.preActions && !Array.isArray(profile.preActions)) {
        result.errors.push("Field 'preActions' must be an array");
      }
      if (profile.productPageActions && !Array.isArray(profile.productPageActions)) {
        result.errors.push("Field 'productPageActions' must be an array");
      }
      if (profile.fieldSelectors && typeof profile.fieldSelectors !== 'object') {
        result.errors.push("Field 'fieldSelectors' must be an object");
      }

      // Bounds validation
      if (profile.concurrency !== undefined && profile.concurrency <= 0) {
        result.errors.push("Field 'concurrency' must be greater than 0");
      }
      if (profile.retries !== undefined && profile.retries < 0) {
        result.errors.push("Field 'retries' cannot be negative");
      }

      // Selector warnings
      if (profile.productLinkSelector && !this.looksLikeCSSSelector(profile.productLinkSelector)) {
        result.warnings.push(`Selector '${profile.productLinkSelector}' may be malformed`);
      }

      result.valid = result.errors.length === 0;

    } catch (error) {
      result.valid = false;
      result.errors.push(`Invalid JSON: ${error.message}`);
    }

    return result;
  }

  private static looksLikeCSSSelector(selector: string): boolean {
    // Basic heuristic: should contain . or # or tag name or [
    return /^[a-z#.\[]/.test(selector.trim());
  }
}
```

**Step 3: Test validator**

Manual test with valid and invalid JSON strings.

**Step 4: Commit**

```bash
git add src/main/validation/profileValidator.ts src/shared/validation-types.ts
git commit -m "feat: add profile validation utility"
```

---

### Task 2.2: Create ProfileImportExport Service

**Files:**
- Create: `src/main/services/ProfileImportExport.ts`

**Step 1: Create import/export service**

Create `src/main/services/ProfileImportExport.ts`:

```typescript
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
        errors: [`Failed to read file: ${error.message}`],
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
        errors: [`Could not fetch profile from URL: ${error.message}`],
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
        errors: [`Failed to import profile: ${error.message}`],
      };
    }
  }

  private serializeProfile(profile: any): any {
    // Return profile data without internal IDs
    const { id, created_at, updated_at, last_synced, ...exportData } = profile;
    return exportData;
  }

  validateJSON(json: string): ValidationResult {
    return ProfileValidator.validate(json);
  }
}
```

**Step 2: Test import/export service**

Manual testing needed (requires Electron running).

**Step 3: Commit**

```bash
git add src/main/services/ProfileImportExport.ts
git commit -m "feat: add ProfileImportExport service for file and URL import"
```

---

### Task 2.3: Add IPC Handlers for Import/Export

**Files:**
- Modify: `src/main/ipc/profileHandlers.ts`
- Modify: `src/main/preload.ts`
- Modify: `src/renderer/types/electron.d.ts`

**Step 1: Add IPC handlers**

In `src/main/ipc/profileHandlers.ts`, add:

```typescript
import { ProfileImportExport } from '../services/ProfileImportExport';

// Initialize service
const importExportService = new ProfileImportExport(profileRepository);

// Export profile
ipcMain.handle('profile:export', async (_, profileId: string) => {
  try {
    const filePath = await importExportService.exportProfile(profileId);
    return { success: true, filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Import from file
ipcMain.handle('profile:import-file', async () => {
  const result = await importExportService.importFromFile();
  return result;
});

// Import from URL
ipcMain.handle('profile:import-url', async (_, url: string) => {
  const result = await importExportService.importFromURL(url);
  return result;
});

// Validate JSON
ipcMain.handle('profile:validate-json', async (_, json: string) => {
  const result = importExportService.validateJSON(json);
  return result;
});

// Clone profile
ipcMain.handle('profile:clone', async (_, sourceId: string) => {
  try {
    const source = profileRepository.getById(sourceId);
    if (!source) {
      throw new Error('Source profile not found');
    }

    // Create clone
    const clone = {
      ...source,
      name: `${source.name} (Copy)`,
      sourceProfileId: source.id,
      isReadonly: false,
      isPublic: false,
    };

    const newId = profileRepository.create(clone);
    return { success: true, profileId: newId };

  } catch (error) {
    return { success: false, error: error.message };
  }
});
```

**Step 2: Expose in preload**

In `src/main/preload.ts`, add:

```typescript
contextBridge.exposeInMainWorld('electronAPI', {
  // ... existing methods
  exportProfile: (profileId: string) => ipcRenderer.invoke('profile:export', profileId),
  importProfileFromFile: () => ipcRenderer.invoke('profile:import-file'),
  importProfileFromURL: (url: string) => ipcRenderer.invoke('profile:import-url', url),
  validateProfileJSON: (json: string) => ipcRenderer.invoke('profile:validate-json', json),
  cloneProfile: (sourceId: string) => ipcRenderer.invoke('profile:clone', sourceId),
});
```

**Step 3: Update TypeScript declarations**

In `src/renderer/types/electron.d.ts`, add:

```typescript
interface ElectronAPI {
  // ... existing methods
  exportProfile: (profileId: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  importProfileFromFile: () => Promise<ImportResult>;
  importProfileFromURL: (url: string) => Promise<ImportResult>;
  validateProfileJSON: (json: string) => Promise<ValidationResult>;
  cloneProfile: (sourceId: string) => Promise<{ success: boolean; profileId?: string; error?: string }>;
}
```

**Step 4: Test IPC handlers**

Run app, test from console: `window.electronAPI.importProfileFromFile()`

**Step 5: Commit**

```bash
git add src/main/ipc/profileHandlers.ts src/main/preload.ts src/renderer/types/electron.d.ts
git commit -m "feat: add IPC handlers for profile import/export"
```

---

## PHASE 3: Marketplace Infrastructure

### Task 3.1: Create MarketplaceService

**Files:**
- Create: `src/main/services/MarketplaceService.ts`
- Create: `src/shared/marketplace-types.ts`

**Step 1: Define marketplace types**

Create `src/shared/marketplace-types.ts`:

```typescript
export interface SyncResult {
  success: boolean;
  profilesAdded: number;
  profilesUpdated: number;
  errors?: string[];
}

export interface PublicProfilesResponse {
  version: string;
  updated_at: number;
  profiles: any[];
}
```

**Step 2: Create marketplace service**

Create `src/main/services/MarketplaceService.ts`:

```typescript
import { ProfileRepository } from '../database/ProfileRepository';
import { ProfileValidator } from '../validation/profileValidator';
import { SyncResult, PublicProfilesResponse } from '../../shared/marketplace-types';

export class MarketplaceService {
  private cdnUrl = 'https://raw.githubusercontent.com/yourusername/profilescraper-profiles/main/public-profiles.json';

  constructor(private profileRepo: ProfileRepository) {}

  async syncPublicProfiles(): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      profilesAdded: 0,
      profilesUpdated: 0,
      errors: [],
    };

    try {
      // Fetch CDN
      const response = await fetch(this.cdnUrl);

      if (!response.ok) {
        result.errors!.push(`CDN returned ${response.status}: ${response.statusText}`);
        return result;
      }

      const data: PublicProfilesResponse = await response.json();

      // Process each profile
      for (const profileData of data.profiles) {
        try {
          // Validate
          const validation = ProfileValidator.validate(JSON.stringify(profileData));
          if (!validation.valid) {
            result.errors!.push(`Profile ${profileData.name} validation failed: ${validation.errors.join(', ')}`);
            continue;
          }

          // Check if exists
          const existing = this.profileRepo.getById(profileData.id);

          if (!existing) {
            // Insert new public profile
            profileData.isPublic = true;
            profileData.isReadonly = true;
            profileData.lastSynced = Date.now();
            this.profileRepo.create(profileData);
            result.profilesAdded++;
          } else if (profileData.updated_at > (existing.lastSynced || 0)) {
            // Update existing (if newer)
            profileData.lastSynced = Date.now();
            this.profileRepo.update(profileData.id, profileData);
            result.profilesUpdated++;
          }

        } catch (error) {
          result.errors!.push(`Failed to sync ${profileData.name}: ${error.message}`);
        }
      }

      result.success = true;

    } catch (error) {
      result.errors!.push(`Sync failed: ${error.message}`);
    }

    return result;
  }

  getPublicProfiles() {
    // Get all public profiles from local database
    const all = this.profileRepo.getAll();
    return all.filter(p => p.isPublic);
  }
}
```

**Step 3: Add IPC handlers**

Create `src/main/ipc/marketplaceHandlers.ts`:

```typescript
import { ipcMain } from 'electron';
import { MarketplaceService } from '../services/MarketplaceService';
import { profileRepository } from '../database/ProfileRepository';

const marketplaceService = new MarketplaceService(profileRepository);

// Sync public profiles
ipcMain.handle('marketplace:sync', async () => {
  return await marketplaceService.syncPublicProfiles();
});

// Get public profiles
ipcMain.handle('marketplace:get-all', async () => {
  return marketplaceService.getPublicProfiles();
});

export { marketplaceService };
```

**Step 4: Register handlers in main**

In `src/main/main.ts`, import:

```typescript
import './ipc/marketplaceHandlers';
```

**Step 5: Expose in preload**

In `src/main/preload.ts`:

```typescript
syncMarketplace: () => ipcRenderer.invoke('marketplace:sync'),
getPublicProfiles: () => ipcRenderer.invoke('marketplace:get-all'),
```

**Step 6: Update TypeScript declarations**

In `src/renderer/types/electron.d.ts`:

```typescript
syncMarketplace: () => Promise<SyncResult>;
getPublicProfiles: () => Promise<ProfileWithMetadata[]>;
```

**Step 7: Commit**

```bash
git add src/main/services/MarketplaceService.ts src/shared/marketplace-types.ts src/main/ipc/marketplaceHandlers.ts src/main/main.ts src/main/preload.ts src/renderer/types/electron.d.ts
git commit -m "feat: add marketplace sync service and IPC handlers"
```

---

## PHASE 4: UI - Profile Library Enhancements

### Task 4.1: Add Domain Grouping Logic

**Files:**
- Modify: `src/renderer/components/ProfileLibrary.tsx`
- Create: `src/renderer/utils/profileGrouping.ts`

**Step 1: Create grouping utility**

Create `src/renderer/utils/profileGrouping.ts`:

```typescript
import { ProfileWithMetadata } from '../../shared/types';

export function getDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return 'unknown';
  }
}

export function groupProfilesByDomain(profiles: ProfileWithMetadata[]): Map<string, ProfileWithMetadata[]> {
  const groups = new Map<string, ProfileWithMetadata[]>();

  for (const profile of profiles) {
    const domain = getDomain(profile.categoryUrl);
    if (!groups.has(domain)) {
      groups.set(domain, []);
    }
    groups.get(domain)!.push(profile);
  }

  // Sort profiles within each group by created_at descending
  for (const [domain, profileList] of groups.entries()) {
    profileList.sort((a, b) => b.created_at - a.created_at);
  }

  return groups;
}

export function sortDomains(domains: string[]): string[] {
  return domains.sort((a, b) => a.localeCompare(b));
}
```

**Step 2: Test grouping utility**

Write simple test or verify manually in console.

**Step 3: Commit**

```bash
git add src/renderer/utils/profileGrouping.ts
git commit -m "feat: add profile domain grouping utility"
```

---

### Task 4.2: Add View Toggle and LocalStorage Persistence

**Files:**
- Modify: `src/renderer/components/ProfileLibrary.tsx`
- Create: `src/renderer/hooks/useLocalStorage.ts`

**Step 1: Create localStorage hook**

Create `src/renderer/hooks/useLocalStorage.ts`:

```typescript
import { useState, useEffect } from 'react';

export function useLocalStorage<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }, [key, value]);

  return [value, setValue];
}
```

**Step 2: Update ProfileLibrary with view toggle**

In `src/renderer/components/ProfileLibrary.tsx`, add:

```typescript
import { useLocalStorage } from '../hooks/useLocalStorage';
import { groupProfilesByDomain, sortDomains } from '../utils/profileGrouping';

export function ProfileLibrary() {
  const [viewMode, setViewMode] = useLocalStorage<'grid' | 'grouped'>('profileViewMode', 'grid');
  const [collapsedDomains, setCollapsedDomains] = useLocalStorage<Set<string>>('collapsedDomains', new Set());

  // ... existing state

  const toggleDomain = (domain: string) => {
    const newCollapsed = new Set(collapsedDomains);
    if (newCollapsed.has(domain)) {
      newCollapsed.delete(domain);
    } else {
      newCollapsed.add(domain);
    }
    setCollapsedDomains(newCollapsed);
  };

  const renderProfiles = () => {
    if (viewMode === 'grid') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProfiles.map(profile => (
            <ProfileCard key={profile.id} profile={profile} />
          ))}
        </div>
      );
    } else {
      const grouped = groupProfilesByDomain(filteredProfiles);
      const domains = sortDomains(Array.from(grouped.keys()));

      return (
        <div className="space-y-6">
          {domains.map(domain => (
            <div key={domain} className="border rounded-lg p-4">
              <button
                onClick={() => toggleDomain(domain)}
                className="flex items-center justify-between w-full text-left"
              >
                <h3 className="text-lg font-semibold">
                  {domain} ({grouped.get(domain)!.length} profiles)
                </h3>
                <span>{collapsedDomains.has(domain) ? '▶' : '▼'}</span>
              </button>

              {!collapsedDomains.has(domain) && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {grouped.get(domain)!.map(profile => (
                    <ProfileCard key={profile.id} profile={profile} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1>Profile Library</h1>

        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={viewMode === 'grid' ? 'active' : ''}
          >
            Grid View
          </button>
          <button
            onClick={() => setViewMode('grouped')}
            className={viewMode === 'grouped' ? 'active' : ''}
          >
            Grouped by Domain
          </button>
        </div>
      </div>

      {renderProfiles()}
    </div>
  );
}
```

**Step 3: Test view toggle**

Run app, switch views, verify state persists on reload.

**Step 4: Commit**

```bash
git add src/renderer/hooks/useLocalStorage.ts src/renderer/components/ProfileLibrary.tsx
git commit -m "feat: add view toggle and domain grouping in Profile Library"
```

---

### Task 4.3: Add Import/Export Buttons and Dialogs

**Files:**
- Create: `src/renderer/components/ImportDialog.tsx`
- Create: `src/renderer/components/ExportWarningDialog.tsx`
- Modify: `src/renderer/components/ProfileLibrary.tsx`
- Modify: `src/renderer/components/ProfileCard.tsx`

**Step 1: Create export warning dialog**

Create `src/renderer/components/ExportWarningDialog.tsx`:

```typescript
import React from 'react';

interface Props {
  profileName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ExportWarningDialog({ profileName, onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-semibold mb-4">Export Profile</h2>

        <p className="mb-4">
          You are about to export <strong>{profileName}</strong>.
        </p>

        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
          <p className="text-sm text-yellow-800">
            ⚠️ This export may contain site-specific selectors.
            Review before sharing publicly.
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 border rounded hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Download JSON
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Create import dialog**

Create `src/renderer/components/ImportDialog.tsx`:

```typescript
import React, { useState } from 'react';
import { ImportResult } from '../../shared/validation-types';

interface Props {
  onClose: () => void;
  onImportSuccess: () => void;
}

export function ImportDialog({ onClose, onImportSuccess }: Props) {
  const [activeTab, setActiveTab] = useState<'file' | 'url'>('file');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFileImport = async () => {
    setLoading(true);
    setResult(null);

    try {
      const importResult = await window.electronAPI.importProfileFromFile();
      setResult(importResult);

      if (importResult.success) {
        setTimeout(() => {
          onImportSuccess();
          onClose();
        }, 1500);
      }
    } catch (error) {
      setResult({
        success: false,
        errors: [error.message],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUrlImport = async () => {
    if (!url.trim()) {
      setResult({ success: false, errors: ['Please enter a URL'] });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const importResult = await window.electronAPI.importProfileFromURL(url);
      setResult(importResult);

      if (importResult.success) {
        setTimeout(() => {
          onImportSuccess();
          onClose();
        }, 1500);
      }
    } catch (error) {
      setResult({
        success: false,
        errors: [error.message],
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
        <h2 className="text-xl font-semibold mb-4">Import Profile</h2>

        {/* Tabs */}
        <div className="flex border-b mb-4">
          <button
            onClick={() => setActiveTab('file')}
            className={`px-4 py-2 ${activeTab === 'file' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            Import File
          </button>
          <button
            onClick={() => setActiveTab('url')}
            className={`px-4 py-2 ${activeTab === 'url' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            Import from URL
          </button>
        </div>

        {/* File Import */}
        {activeTab === 'file' && (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Select a .json profile file to import
            </p>
            <button
              onClick={handleFileImport}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Importing...' : 'Choose File'}
            </button>
          </div>
        )}

        {/* URL Import */}
        {activeTab === 'url' && (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Paste a URL to a profile JSON file (GitHub raw link, CDN, etc.)
            </p>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://raw.githubusercontent.com/..."
              className="w-full px-3 py-2 border rounded mb-3"
            />
            <button
              onClick={handleUrlImport}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Importing...' : 'Import from URL'}
            </button>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className={`mt-4 p-3 rounded ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            {result.success ? (
              <p className="text-green-800">✓ Profile imported successfully!</p>
            ) : (
              <div>
                <p className="text-red-800 font-semibold mb-2">Import failed:</p>
                <ul className="text-sm text-red-700 list-disc list-inside">
                  {result.errors?.map((error, i) => <li key={i}>{error}</li>)}
                </ul>
              </div>
            )}

            {result.warnings && result.warnings.length > 0 && (
              <div className="mt-2">
                <p className="text-yellow-800 text-sm font-semibold">Warnings:</p>
                <ul className="text-xs text-yellow-700 list-disc list-inside">
                  {result.warnings.map((warning, i) => <li key={i}>{warning}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 3: Update ProfileLibrary with Import button**

In `src/renderer/components/ProfileLibrary.tsx`:

```typescript
import { ImportDialog } from './ImportDialog';

export function ProfileLibrary() {
  const [showImportDialog, setShowImportDialog] = useState(false);

  // ... existing code

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1>Profile Library</h1>

        <div className="flex gap-2">
          <button
            onClick={() => setShowImportDialog(true)}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Import Profile
          </button>

          {/* View toggle buttons */}
        </div>
      </div>

      {/* ... existing rendering */}

      {showImportDialog && (
        <ImportDialog
          onClose={() => setShowImportDialog(false)}
          onImportSuccess={() => loadProfiles()}
        />
      )}
    </div>
  );
}
```

**Step 4: Update ProfileCard with Export button**

In `src/renderer/components/ProfileCard.tsx`:

```typescript
import { ExportWarningDialog } from './ExportWarningDialog';

export function ProfileCard({ profile }: Props) {
  const [showExportDialog, setShowExportDialog] = useState(false);

  const handleExport = async () => {
    const result = await window.electronAPI.exportProfile(profile.id);
    if (result.success) {
      // Show success toast
      console.log('Exported to:', result.filePath);
    }
    setShowExportDialog(false);
  };

  return (
    <div className="border rounded-lg p-4">
      {/* ... existing card content */}

      <div className="flex gap-2 mt-4">
        {!profile.isReadonly && (
          <>
            <button onClick={handleEdit}>Edit</button>
            <button onClick={() => setShowExportDialog(true)}>Export</button>
          </>
        )}

        {profile.isReadonly && (
          <button onClick={handleClone}>Clone to Edit</button>
        )}
      </div>

      {showExportDialog && (
        <ExportWarningDialog
          profileName={profile.name}
          onConfirm={handleExport}
          onCancel={() => setShowExportDialog(false)}
        />
      )}
    </div>
  );
}
```

**Step 5: Test import/export flows**

Manual testing in running app.

**Step 6: Commit**

```bash
git add src/renderer/components/ImportDialog.tsx src/renderer/components/ExportWarningDialog.tsx src/renderer/components/ProfileLibrary.tsx src/renderer/components/ProfileCard.tsx
git commit -m "feat: add import/export dialogs and buttons to Profile Library"
```

---

### Task 4.4: Add Read-only Indicators and Clone Button

**Files:**
- Modify: `src/renderer/components/ProfileCard.tsx`
- Modify: `src/renderer/components/ProfileBuilder.tsx`

**Step 1: Update ProfileCard with read-only indicators**

In `src/renderer/components/ProfileCard.tsx`:

```typescript
export function ProfileCard({ profile }: Props) {
  const handleClone = async () => {
    const result = await window.electronAPI.cloneProfile(profile.id);
    if (result.success) {
      // Navigate to edit the clone
      navigate(`/profiles/${result.profileId}/edit`);
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${profile.isReadonly ? 'border-blue-300 bg-blue-50' : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold">{profile.name}</h3>
        {profile.isReadonly && (
          <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
            🔒 Public
          </span>
        )}
      </div>

      <p className="text-sm text-gray-600">{getDomain(profile.categoryUrl)}</p>

      {profile.description && (
        <p className="text-sm mt-2">{profile.description}</p>
      )}

      {profile.sourceProfileId && (
        <p className="text-xs text-gray-500 mt-2">
          Cloned from: {profile.author || 'Unknown'}
        </p>
      )}

      <div className="flex gap-2 mt-4">
        <button onClick={handleRun}>Run</button>

        {!profile.isReadonly ? (
          <>
            <button onClick={handleEdit}>Edit</button>
            <button onClick={() => setShowExportDialog(true)}>Export</button>
            <button onClick={handleDelete}>Delete</button>
          </>
        ) : (
          <button onClick={handleClone} className="bg-blue-600 text-white">
            Clone to Edit
          </button>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Update ProfileBuilder to show read-only banner**

In `src/renderer/components/ProfileBuilder.tsx`:

```typescript
export function ProfileBuilder() {
  const { id } = useParams();
  const profile = useProfileStore(state => state.profile);

  // ... existing code

  return (
    <div>
      {profile.isReadonly && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-6">
          <p className="text-yellow-800">
            🔒 This is a public profile and cannot be edited.
            <button
              onClick={handleClone}
              className="ml-2 underline font-semibold"
            >
              Clone it to make changes
            </button>
          </p>
        </div>
      )}

      {/* ... rest of form */}

      <div className="flex justify-end gap-2">
        {!profile.isReadonly && (
          <button type="submit">
            {id ? 'Update Profile' : 'Create Profile'}
          </button>
        )}
      </div>
    </div>
  );
}
```

**Step 3: Test read-only enforcement**

Import a public profile, verify Edit is disabled, Clone works.

**Step 4: Commit**

```bash
git add src/renderer/components/ProfileCard.tsx src/renderer/components/ProfileBuilder.tsx
git commit -m "feat: add read-only indicators and clone functionality"
```

---

## PHASE 5: UI - Marketplace Tab

### Task 5.1: Create Marketplace Component

**Files:**
- Create: `src/renderer/components/Marketplace.tsx`
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/components/Sidebar.tsx`

**Step 1: Create Marketplace component**

Create `src/renderer/components/Marketplace.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import { ProfileWithMetadata } from '../../shared/types';
import { getDomain } from '../utils/profileGrouping';
import { ProfileCard } from './ProfileCard';

export function Marketplace() {
  const [profiles, setProfiles] = useState<ProfileWithMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadPublicProfiles();
  }, []);

  const loadPublicProfiles = async () => {
    setLoading(true);
    try {
      const publicProfiles = await window.electronAPI.getPublicProfiles();
      setProfiles(publicProfiles);
    } catch (error) {
      console.error('Failed to load public profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await window.electronAPI.syncMarketplace();
      if (result.success) {
        await loadPublicProfiles();
        console.log(`Synced: +${result.profilesAdded} new, ${result.profilesUpdated} updated`);
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  // Filter profiles
  const filteredProfiles = profiles.filter(profile => {
    // Search filter
    const matchesSearch = !searchTerm ||
      profile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getDomain(profile.categoryUrl).toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.author?.toLowerCase().includes(searchTerm.toLowerCase());

    // Tag filter
    const matchesTags = selectedTags.size === 0 ||
      (profile.tags && profile.tags.some(tag => selectedTags.has(tag)));

    return matchesSearch && matchesTags;
  });

  // Get all unique tags
  const allTags = Array.from(new Set(
    profiles.flatMap(p => p.tags || [])
  )).sort();

  const toggleTag = (tag: string) => {
    const newTags = new Set(selectedTags);
    if (newTags.has(tag)) {
      newTags.delete(tag);
    } else {
      newTags.add(tag);
    }
    setSelectedTags(newTags);
  };

  if (loading) {
    return <div className="p-8">Loading marketplace...</div>;
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Profile Marketplace</h1>

        <button
          onClick={handleSync}
          disabled={syncing}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {syncing ? 'Syncing...' : '🔄 Refresh'}
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name, domain, or author..."
          className="w-full px-4 py-2 border rounded"
        />
      </div>

      {/* Tag filters */}
      {allTags.length > 0 && (
        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-2">Filter by tags:</p>
          <div className="flex flex-wrap gap-2">
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1 rounded-full text-sm ${
                  selectedTags.has(tag)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results count */}
      <p className="text-sm text-gray-600 mb-4">
        Showing {filteredProfiles.length} of {profiles.length} profiles
      </p>

      {/* Profile grid */}
      {filteredProfiles.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No public profiles available.</p>
          <button onClick={handleSync} className="mt-4 text-blue-600 underline">
            Sync with repository
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProfiles.map(profile => (
            <ProfileCard key={profile.id} profile={profile} />
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Add route in App**

In `src/renderer/App.tsx`:

```typescript
import { Marketplace } from './components/Marketplace';

function App() {
  return (
    <Router>
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/profiles" element={<ProfileLibrary />} />
            <Route path="/profiles/new" element={<ProfileBuilder />} />
            <Route path="/profiles/:id/edit" element={<ProfileBuilder />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/jobs" element={<JobsDashboard />} />
            <Route path="/jobs/:id/data" element={<JobDataViewer />} />
            <Route path="/help" element={<Help />} />
            <Route path="/" element={<Navigate to="/profiles" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
```

**Step 3: Add to Sidebar navigation**

In `src/renderer/components/Sidebar.tsx`:

```typescript
export function Sidebar() {
  return (
    <aside className="w-64 bg-gray-900 text-white">
      <nav>
        <NavLink to="/profiles">📁 Profiles</NavLink>
        <NavLink to="/marketplace">🛒 Marketplace</NavLink>
        <NavLink to="/jobs">⚙️ Jobs</NavLink>
        <NavLink to="/help">❓ Help</NavLink>
      </nav>
    </aside>
  );
}
```

**Step 4: Test marketplace**

Run app, navigate to /marketplace, test search and tag filters.

**Step 5: Commit**

```bash
git add src/renderer/components/Marketplace.tsx src/renderer/App.tsx src/renderer/components/Sidebar.tsx
git commit -m "feat: add Marketplace tab with search and tag filtering"
```

---

## PHASE 6: Testing & Polish

### Task 6.1: Manual Testing Checklist

**Step 1: Export/Import Testing**

Test checklist:
- [ ] Export a user profile → Verify JSON file downloads
- [ ] Import the exported file → Verify all fields preserved
- [ ] Import from GitHub raw URL → Verify works
- [ ] Import invalid JSON → Verify user-friendly error
- [ ] Import with missing required fields → Verify validation errors

**Step 2: Marketplace Testing**

Test checklist:
- [ ] Sync marketplace → Verify profiles appear
- [ ] Search by name → Verify filtering works
- [ ] Filter by tags → Verify filtering works
- [ ] Clone public profile → Verify creates editable copy
- [ ] Attempt to edit public profile → Verify blocked with message
- [ ] Network failure during sync → Verify graceful fallback

**Step 3: UI Testing**

Test checklist:
- [ ] Toggle grid/grouped view → Verify persists on reload
- [ ] Collapse/expand domain groups → Verify state persists
- [ ] Read-only profile shows lock icon → Verify visual indicator
- [ ] Cloned profile shows "Cloned from" → Verify attribution
- [ ] Import button opens dialog → Verify both tabs work

**Step 4: Repository Testing**

Test checklist:
- [ ] Create profile with metadata → Verify saves correctly
- [ ] Update read-only profile → Verify throws error
- [ ] Clone profile → Verify source_profile_id set
- [ ] Delete profile → Verify cascades (check jobs table)

**Step 5: Document findings**

Note any bugs found and fix them.

**Step 6: Commit**

```bash
git add .
git commit -m "test: manual testing completed, bugs fixed"
```

---

### Task 6.2: Update Documentation

**Files:**
- Modify: `README.md`

**Step 1: Update README with new features**

Add section to README.md:

```markdown
## Profile Sharing & Marketplace

### Importing Profiles

**From File:**
1. Click "Import Profile" in Profile Library
2. Select "Import File" tab
3. Choose a .json profile file
4. Review and confirm import

**From URL:**
1. Click "Import Profile" in Profile Library
2. Select "Import from URL" tab
3. Paste GitHub raw URL or CDN link
4. Review and confirm import

### Exporting Profiles

1. Click "Export" on any profile card
2. Review the warning about sharing
3. Choose save location
4. Profile downloads as JSON file

### Marketplace

Browse community-contributed public profiles:
1. Navigate to "Marketplace" tab
2. Search by name, domain, or author
3. Filter by tags (e-commerce, real-estate, etc.)
4. Click "Clone" to create an editable copy

Public profiles are read-only. Clone them to make modifications.

### Domain Grouping

Organize your profiles by website:
1. Click "Grouped by Domain" toggle in Profile Library
2. Profiles grouped under domain headers
3. Click domain to collapse/expand
4. View preference persists across sessions
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add profile sharing and marketplace documentation"
```

---

### Task 6.3: Final Review and Cleanup

**Step 1: Review all changes**

Run: `git log --oneline master..HEAD`

Review commit history for clarity.

**Step 2: Run full app test**

Start app, test all features end-to-end.

**Step 3: Check for console errors**

Open DevTools, verify no errors during normal usage.

**Step 4: Clean up any TODOs or debug code**

Search codebase: `grep -r "TODO\|FIXME\|console.log" src/`

**Step 5: Final commit**

```bash
git add .
git commit -m "chore: final cleanup and polish"
```

---

## EXECUTION COMPLETE

Plan saved to `docs/plans/2025-11-06-profile-sharing-implementation.md`.

All 6 phases documented with bite-sized tasks, exact file paths, complete code examples, and testing steps.
