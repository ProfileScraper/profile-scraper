# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ProfileScraper is an Electron desktop application for scraping e-commerce product data using configurable profiles. It features concurrent scraping with anti-detection capabilities powered by Patchright (Playwright fork), SQLite-based storage, and a React UI with real-time progress monitoring.

## Development Commands

```bash
# Install dependencies
npm install

# Development (runs renderer on port 5174 + main process)
npm run dev

# Build for production
npm run build

# Create macOS DMG installer
npm run package

# Run tests
npm test
```

### Running Individual Tests

```bash
# Run specific test file
npx jest path/to/test.test.ts

# Run tests matching pattern
npx jest --testNamePattern="pattern"

# Run with watch mode
npx jest --watch
```

## Architecture Overview

### Process Architecture (Electron)

- **Main Process** (`src/main/main.ts`): Node.js process managing app lifecycle, windows, database, and scraping engine
- **Renderer Process** (`src/renderer/`): React UI running in browser context
- **IPC Communication** (`src/shared/ipc-channels.ts`): Bidirectional channel definitions for inter-process communication
- **Preload Script** (`src/main/preload.ts`): Secure bridge exposing IPC methods to renderer

### Core Subsystems

**1. Scraping Engine** (`src/main/scraper/`)
- **ScrapeOrchestrator**: Manages browser lifecycle, worker threads, and scraping phases (initializing → gathering_urls → crawling_products → finalizing)
- **CategoryCrawler**: Navigates category pages and extracts product URLs using pagination
- **ProductWorker**: Concurrent workers that scrape individual product pages
- **ActionExecutor**: Executes pre-defined actions (click, scroll, wait, type) on pages

**2. Database Layer** (`src/main/database/`)
- SQLite schema with repositories for profiles, jobs, products, scrape_data, and product_logs
- Normalized storage: products table links to job_id, scrape_data stores field name/value pairs per product
- Profile metadata supports sharing: isPublic, isReadonly, sourceUrl, author, tags

**3. State Management**
- **Zustand stores** (`src/renderer/store/`):
  - `scrapeStore.ts`: Job status, progress, phase tracking
  - `profileStore.ts`: Profile CRUD operations
- IPC handlers sync state between main/renderer processes

**4. Storage & Checkpointing** (`src/main/storage/`)
- **CheckpointManager**: Saves progress.json for resumable scraping (completed/pending URLs, counts)
- **DataExporter**: Exports job data to CSV/JSON
- **StorageManager**: Handles product/field persistence with overwrite logic

### Key Data Flow

1. User creates profile in UI → IPC → ProfileRepository → SQLite
2. User starts job → IPC → ScrapeOrchestrator instantiated with profile + jobId
3. Orchestrator spawns CategoryCrawler + N ProductWorkers (concurrency setting)
4. Crawler emits 'urls' events → Orchestrator queues them → Workers consume queue
5. Workers scrape → ActionExecutor executes productPageActions → Extract fields via selectors
6. ProductLogRepository logs every selector attempt, element count, success/error per product
7. Progress emitted via EventEmitter → IPC → Renderer updates UI every 3 seconds
8. Checkpoint saved every N products (configurable) for resumability

## Anti-Detection Implementation

The scraper uses comprehensive bot evasion in `ScrapeOrchestrator.ts`:
- Randomized user agents (Chrome versions 129-131)
- Varied viewport sizes per worker
- navigator.webdriver override
- window.chrome runtime injection
- WebGL vendor spoofing (Intel Inc./Intel Iris)
- Randomized hardware specs (cores 8-16, memory 8-24GB, battery 0.8-1.0)
- Human-like delays and mouse movements

**Important**: When modifying scraping logic, maintain these anti-detection patterns to avoid bot detection.

## Profile System

Profiles are JSON configurations defining:
- Category URL and product link selector
- Field selectors with CSS/XPath + optional attribute extraction
- Pre-actions (category page) and product page actions
- Pagination strategy (button/infinite scroll/URL-based)
- Concurrency, delays, retries, checkpoint interval
- Headless mode (default true)

**Profile Sharing**:
- Profiles can be exported as JSON and imported from file or HTTPS URL
- Profile Explorer (`src/renderer/components/ProfileExplorer.tsx`) displays public profiles
- Public profiles are read-only; users clone them to create editable copies
- Profile validation in `src/main/validation/profileValidator.ts` and `src/shared/config-schema.ts`

## Database Schema Notes

```sql
-- Products table stores URL + timestamp per job
products (id, job_id, url, scraped_at)

-- Scrape data normalized: one row per field per product
scrape_data (id, product_id, field_name, field_value)

-- Product logs: granular diagnostic data per field extraction
product_logs (id, product_id, timestamp, log_level, message, field_name, selector, element_count, error_message)
```

**Why normalized**: Profiles have dynamic field names. Storing field_name/field_value pairs allows arbitrary schemas without ALTER TABLE.

## Job Phases

Jobs progress through phases (tracked in jobs.phase column):
1. `initializing` - Browser launch, worker setup
2. `gathering_urls` - CategoryCrawler extracting product links
3. `crawling_products` - ProductWorkers scraping products
4. `finalizing` - Cleanup and completion

UI components display phase-specific messaging. When adding new phases, update type definitions in `src/shared/types.ts` and JobsDashboard display logic.

## Testing Notes

- Test files in `tests/` directory
- Jest configured with ts-jest for TypeScript support
- No existing integration tests for scraping (requires headless browser testing setup)
- Manual testing checklist in `docs/MANUAL_TESTING_CHECKLIST.md`

## Data Storage Location

```
~/Library/Application Support/ProfileScraper/
├── data/scraper.db          # SQLite database
├── logs/scrape.log          # Winston application logs
└── output/{profileId}/{jobId}/progress.json  # Checkpoints
```

## Common Pitfalls

1. **IPC Type Mismatches**: Ensure types in `src/shared/types.ts` match IPC handler return types
2. **Checkpoint Resume**: When modifying ScrapeOrchestrator, verify checkpoint loading/saving logic
3. **Product ID Timing**: ProductWorker buffers logs until product is saved to DB (see `setProductId()` pattern)
4. **Selector Changes**: Field selectors support both text extraction (default) and attribute extraction (`{selector, attribute}` object)
5. **React 19**: Using latest React with concurrent features; avoid legacy patterns
6. **Tailwind v4**: Uses new @theme syntax, not old theme() function

## Build System

- Vite for renderer bundling (port 5174)
- TypeScript compilation for main process (separate tsconfig)
- electron-builder for packaging (DMG output in `release/`)
- Development uses concurrently to run renderer dev server + electron main

## Key Dependencies

- **patchright**: Anti-detection browser automation (must use instead of playwright)
- **node:sqlite**: Native SQLite (not better-sqlite3)
- **zustand**: Lightweight state management
- **react-beautiful-dnd**: Drag-drop for profile field ordering
- **winston**: Structured logging
