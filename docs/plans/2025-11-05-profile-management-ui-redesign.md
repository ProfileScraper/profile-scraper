# Profile Management & UI Redesign

**Date:** 2025-11-05
**Status:** Design Approved
**Architecture:** UI-First with Data Layer

## Overview

This design adds comprehensive profile management, guided profile creation, visual workflow building, and job tracking to the configurable web scraper. The implementation preserves the existing scraper engine while adding a new data layer (SQLite) and enhanced React UI components.

## User Requirements

As a user, I should be able to:
1. Add new profiles through a guided interactive wizard with live browser testing
2. View, select, and edit previous profiles in a library view
3. Build scraping workflows visually with drag-and-drop action blocks
4. Configure the orchestrator with smart defaults and optional advanced settings
5. Track progress of ongoing jobs with real-time worker status and job history

## Architecture Overview

### Layers

**UI Layer:**
- React components with sidebar navigation
- New routes: Profile Library, Profile Builder/Editor, Jobs Dashboard
- Existing Zustand stores + new stores for profiles and jobs

**Data Layer:**
- SQLite database (`scraper.db`) with repositories
- Library: `better-sqlite3` (synchronous, minimal overhead)
- Repositories: ProfileRepository, JobRepository, JobErrorRepository

**Scraper Engine (Unchanged):**
- Existing ScrapeOrchestrator, workers, core scraping logic
- Receives configuration objects as before
- No knowledge of SQLite

### Data Flow

1. User interacts with UI → updates SQLite via repository methods
2. Starting scrape → load profile from SQLite → pass to ScrapeOrchestrator
3. Scrape events → update job records in SQLite + UI state via IPC
4. Job history persisted in SQLite for dashboard display

**Key Principle:** SQLite holds persistent data (profiles, job history). Zustand stores hold transient UI state (current page, form inputs, running job progress). The existing scraper code doesn't know about SQLite.

## Component Structure

### Sidebar Navigation
- Icons + labels: Profiles, Jobs, Settings
- Running job indicator badge when scraper is active
- Persistent across all views

### Routes & Components

```
/profiles          → ProfileLibrary (card/list view of all profiles)
/profiles/new      → ProfileBuilder (guided interactive wizard)
/profiles/:id/edit → ProfileEditor (same UI as builder, pre-filled)
/jobs              → JobsDashboard (current + historical jobs)
/jobs/:id          → JobDetails (detailed view of specific job run)
```

### Component Hierarchy

```
App
├── Sidebar (nav)
└── MainContent (route-based)
    ├── ProfileLibrary
    │   └── ProfileCard (reusable)
    ├── ProfileBuilder/ProfileEditor
    │   ├── BasicInfoStep
    │   ├── SelectorInspector (inspector mode)
    │   ├── WorkflowBuilder (visual action builder)
    │   └── OrchestratorConfig (smart defaults + override)
    ├── JobsDashboard
    │   ├── CurrentJobPanel
    │   └── JobHistoryList
    └── JobDetails
        ├── JobStats
        ├── ProductsTable
        └── ErrorsPanel
```

### State Management

- **scrapeStore** (existing): Running scrape state, progress, products, errors
- **profileStore** (new): Current profile being created/edited
- **jobsStore** (new): Job history browsing state
- All stores backed by SQLite repositories for persistence

## Database Schema

```sql
-- Profiles table
CREATE TABLE profiles (
  id TEXT PRIMARY KEY,           -- UUID
  name TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  category_url TEXT NOT NULL,
  pre_actions TEXT,              -- JSON array of Action objects
  pagination TEXT NOT NULL,      -- JSON PaginationConfig object
  product_link_selector TEXT,
  product_page_actions TEXT,     -- JSON array of Action objects
  field_selectors TEXT,          -- JSON object mapping field names to selectors
  concurrency INTEGER DEFAULT 3,
  delay_min INTEGER DEFAULT 2000,
  delay_max INTEGER DEFAULT 4000,
  retries INTEGER DEFAULT 3,
  checkpoint_interval INTEGER DEFAULT 10
);

-- Jobs table (historical record of scrape runs)
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,           -- UUID
  profile_id TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,          -- NULL if running
  status TEXT NOT NULL,          -- 'running', 'completed', 'stopped', 'failed'
  total_products INTEGER,
  products_scraped INTEGER,
  success_count INTEGER,
  fail_count INTEGER,
  output_dir TEXT,
  checkpoint_path TEXT,
  error_message TEXT,            -- NULL unless failed
  FOREIGN KEY (profile_id) REFERENCES profiles(id)
);

-- Job errors table (detailed error tracking)
CREATE TABLE job_errors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT NOT NULL,
  url TEXT NOT NULL,
  error_message TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (job_id) REFERENCES jobs(id)
);
```

### Repository Classes

**ProfileRepository:**
- `create(profile: SiteProfile): string` - Returns profile ID
- `update(id: string, profile: SiteProfile): void`
- `delete(id: string): void`
- `getById(id: string): SiteProfile | null`
- `getAll(): SiteProfile[]`

**JobRepository:**
- `create(jobData): string` - Returns job ID
- `update(id: string, updates): void`
- `getById(id: string): Job | null`
- `getAll(filters?): Job[]`
- `getByProfileId(profileId: string): Job[]`

**JobErrorRepository:**
- `create(jobId: string, error): void`
- `getByJobId(jobId: string): JobError[]`

### Migration Strategy

- On app startup, check if SQLite DB exists
- If missing, create schema and migrate from `configs/scraper-config.json`
- Keep JSON file as backup for backward compatibility
- Add export feature to dump SQLite profiles back to JSON format

## Profile Builder - Guided Interactive Flow

### Step 1: Basic Info
- Profile name (text input with validation)
- Target URL (text input with URL validation)
- "Load Page in Inspector" button → launches browser in background

### Step 2: Selector Inspector

**Inspector Mode:**
- Tree view of page DOM elements
- Visual overlay mode using Chrome DevTools Protocol (CDP)
- User clicks "Inspect" button → Electron app communicates with browser
- When user clicks element in browser, selector is captured and highlighted
- Three selector options presented: CSS selector, XPath, or custom

**Fields to Configure:**
- Product link selector (required)
- Field selectors (add multiple: field name → selector mapping)
- Pagination selector (optional)

**Implementation:**
- Launch headless browser using existing patchright/Playwright setup
- Expose CDP connection to main process
- Main process executes `page.evaluate()` to inject overlay script
- Overlay captures selector and sends to main via CDP
- IPC channels: `inspector:launch`, `inspector:get-selector`, `inspector:test-action`, `inspector:close`

### Step 3: Visual Workflow Builder

**Pre-Actions & Product Page Actions:**

**Canvas Area:**
- Vertical sequence of action blocks
- Toolbar with available actions:
  - Click Element
  - Wait/Sleep
  - Scroll To
  - Wait For Selector
  - Type Text

**Interaction:**
- Drag action from toolbar → drop in sequence
- Each block displays: icon, action type, key parameter
- Click block to open configuration panel (right side):
  - Action-specific inputs (selector field, duration slider, etc.)
  - "Optional" checkbox (fail gracefully if action fails)
  - "Test Action" button (runs action in inspector browser)
- Reorder: drag blocks up/down
- Delete: trash icon on hover

**Implementation:**
- Use `react-beautiful-dnd` for drag-and-drop (~50KB, well-maintained)
- Action blocks stored as array in profileStore
- Each block = Action object matching existing type system

### Step 4: Orchestrator Config

**Smart Defaults:**
- System sets intelligent defaults based on site complexity heuristic
- Displayed prominently with explanation

**Advanced Settings Panel (Expandable):**
- Concurrency slider (1-10 workers)
- Delay range (min/max sliders in milliseconds)
- Retries spinner
- Checkpoint interval
- Each setting has tooltip explaining impact

### Step 5: Review & Save

- Summary card showing all configured options
- "Test Run" button (scrapes 3 products to verify config)
- "Save Profile" button → writes to SQLite via ProfileRepository

## Jobs Dashboard & Progress Tracking

### Current Job Panel (Top Section)

**Displayed when job is running:**

**Progress Metrics:**
- Large progress bar with percentage
- Key metrics grid:
  - Products scraped / Total
  - Success count (green badge)
  - Failed count (red badge)
  - Elapsed time
  - Estimated time remaining

**Live Worker Status (New Feature):**
- List of active workers (Worker 1, Worker 2, etc.)
- Each shows:
  - Current URL being processed
  - Status icon (processing/waiting)
- Auto-updates via IPC events from orchestrator

**Controls:**
- Pause/Resume button
- Stop button
- "View Details" button → navigate to `/jobs/:id` for current job

### Job History List (Bottom Section)

**Display:**
- Table/card view of past jobs
- Columns: Profile Name, Started At, Duration, Status, Products, Success Rate
- Status badges: Completed (green), Failed (red), Stopped (yellow)

**Features:**
- Filter dropdown: All / Completed / Failed / Last 7 days
- Click row → navigate to `/jobs/:id`
- "Export" button on each row (CSV/JSON download)
- Pagination for large history

### Job Details Page (`/jobs/:id`)

**Header:**
- Profile name, date/time, final status

**Stats Cards:**
- Duration
- Total products
- Success/Fail counts

**Products Table:**
- Columns: Product URL, Fields scraped, Status
- Search/filter capability
- Export button

**Errors Panel (Expandable):**
- List of all errors with URL, error message, timestamp
- Copy error button for debugging
- Data sourced from `job_errors` table

**Actions:**
- "Run Again with This Profile" button

### Data Persistence

**Job Lifecycle:**
1. Job record created in SQLite when scrape starts (status: 'running')
2. Progress updates sent via IPC → update both UI store AND SQLite job record
3. Errors tracked in `job_errors` table in real-time
4. On complete/stop → final stats written to SQLite (status: 'completed'/'stopped'/'failed')

**IPC Flow:**
- Orchestrator emits events → Main process handlers → Update SQLite + send to renderer
- Renderer subscribes to IPC events → updates UI stores
- Dashboard queries SQLite via IPC for historical data

## Technical Implementation

### New Dependencies

- `better-sqlite3`: Synchronous SQLite bindings (works in Electron main process)
- `uuid`: For generating profile and job IDs
- `react-router-dom`: For client-side routing
- `react-beautiful-dnd`: For drag-and-drop in workflow builder (~50KB)

### IPC Channel Additions

**Profile Operations:**
- `profile:create`
- `profile:update`
- `profile:delete`
- `profile:list`
- `profile:get`

**Job Operations:**
- `job:create`
- `job:update`
- `job:list`
- `job:get`
- `job:get-errors`

**Inspector Operations:**
- `inspector:launch`
- `inspector:get-selector`
- `inspector:test-action`
- `inspector:close`

### Testing Approach

**Unit Tests:**
- Repository classes with in-memory SQLite
- Pure functions and utilities

**Integration Tests:**
- IPC handlers
- Database migrations
- Profile/job CRUD operations

**Component Tests:**
- React components with React Testing Library
- User interactions (drag-and-drop, form inputs)

**E2E Test:**
- Full profile creation flow (basic info → inspector → workflow → save)
- Job run and history viewing

## Design Constraints

1. **Preserve existing scraper engine**: Keep ScrapeOrchestrator, workers, and core scraping logic intact
2. **Minimize new dependencies**: Avoid heavy UI libraries, keep bundle size reasonable
3. **No timeline constraints**: Quality over speed - build properly with full testing
4. **Backward compatibility**: Support migration from existing JSON configs

## Success Criteria

- Users can create profiles without manually editing JSON
- Visual workflow builder makes action configuration intuitive
- Live inspector mode reduces selector trial-and-error
- Job history provides audit trail and debugging capability
- All existing scraper functionality preserved and working
- Tests pass for new components and integrations
