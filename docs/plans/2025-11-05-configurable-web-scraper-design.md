# Configurable Web Scraper - Design Document

**Date**: 2025-11-05
**Status**: Approved
**Target**: Retailer/reseller websites (initially B&H Photo for lighting equipment specs)

## Overview

A desktop application for scraping product specifications from e-commerce websites with configurable selectors, actions, and concurrent processing. Built with Electron for cross-platform deployment and patchright for anti-detection browser automation.

## Requirements

### Functional Requirements
- Scrape 30+ specification fields from product pages
- Support multiple retailer profiles with different page structures
- Handle missing/optional fields gracefully (save as null)
- Export data to both CSV and JSON formats
- Resume interrupted scrapes from checkpoints
- Real-time progress monitoring via UI
- Visual configuration editor for selectors and actions

### Non-Functional Requirements
- Process 1,000-10,000 products efficiently
- Avoid bot detection using patchright
- Moderate rate limiting (2-4 second delays per context)
- 80%+ test coverage for core logic
- Cross-platform support (macOS, Windows, Linux)

## Architecture

### System Design

**Architecture Pattern**: Concurrent Multi-Context

A single browser instance spawns N parallel contexts (3-5 configurable), each processing product pages independently. A `ScrapeOrchestrator` manages work distribution and checkpoint persistence.

**Process Architecture**:
- **Main Process** (Node.js): Handles all scraping logic, file I/O, and browser automation
- **Renderer Process** (React): UI for configuration, monitoring, and results preview
- **IPC Bridge**: Event-based communication between processes

### Component Breakdown

#### Main Process Components

**1. ScrapeOrchestrator**
- Manages browser lifecycle and context pool
- Maintains work queue (array of product URLs)
- Distributes URLs to available workers
- Coordinates checkpoint saves
- Emits progress events to renderer

**2. CategoryCrawler**
- Navigates category pages
- Handles pagination (button clicks or infinite scroll)
- Extracts product URLs using configured selector
- Returns complete URL list for queue

**3. ProductWorker**
- Manages single browser context
- Executes pre-scrape actions (clicks, scrolls, waits)
- Extracts specs using CSS selectors from config
- Applies random delays (2-4s) between requests
- Handles retries on failure

**4. ActionExecutor**
- Interprets action configurations
- Executes browser actions:
  - `clickElement(selector, optional)`: Click element
  - `sleep(duration)`: Wait milliseconds
  - `scrollTo(selector)`: Scroll into view
  - `waitForSelector(selector, timeout)`: Wait for element
  - `type(selector, text)`: Type into input
- Gracefully handles optional actions (skip if element missing)

**5. StorageManager**
- Appends products to CSV (using csv-writer)
- Appends products to JSON (array format)
- Atomic writes to prevent corruption
- Creates output directory if missing

**6. CheckpointManager**
- Saves `progress.json` after every 10 products (configurable)
- Tracks completed URLs and pending queue
- Enables resume on application restart
- Stores last run metadata (timestamp, profile name)

#### Renderer Process Components

**1. Dashboard Component**
- Real-time metrics: products scraped, success rate, ETA
- Progress bar with percentage
- Active product URLs being processed
- Control buttons: Start, Pause, Resume, Stop

**2. ConfigEditor Component**
- Profile selector dropdown
- Category URL input
- Concurrency slider (1-10 contexts)
- Action sequence builder (add/remove/reorder)
- Field selector mapping table
- Test mode: Live page preview for selector validation

**3. LogViewer Component**
- Live log feed from Winston
- Severity filtering (info, warning, error)
- Search/filter by keyword
- Export logs to file

**4. ResultsPreview Component**
- Paginated table of scraped products
- Field completeness indicators (green/yellow/red)
- Export buttons for CSV/JSON
- Checkpoint status display

### Data Flow

```
1. User enters category URL → Renderer sends `scrape:start` IPC
2. Orchestrator launches browser, creates N contexts
3. CategoryCrawler extracts product URLs → Work queue populated
4. Workers pull URLs concurrently, apply delays
5. ProductWorker executes actions → Extracts specs
6. StorageManager appends to CSV/JSON
7. CheckpointManager updates progress.json
8. Progress event → Renderer updates dashboard
9. Repeat until queue empty
```

## Configuration System

### Profile Structure

JSON-based configuration stored in `configs/scraper-config.json`:

```json
{
  "profiles": {
    "b&h-photo": {
      "name": "B&H Photo Video",
      "categoryUrl": "https://example.com/lighting",
      "preActions": [
        {"type": "clickElement", "selector": "#cookie-accept", "optional": true},
        {"type": "sleep", "duration": 1000}
      ],
      "pagination": {
        "type": "button",
        "selector": ".next-page",
        "maxPages": 50
      },
      "productLinkSelector": ".product-card a",
      "productPageActions": [
        {"type": "clickElement", "selector": ".specs-toggle", "optional": true},
        {"type": "sleep", "duration": 500}
      ],
      "fieldSelectors": {
        "Brand": ".brand-name",
        "Model": ".model-number",
        "Light Engine": ".spec-row[data-field='light-engine'] .value",
        "CCT Start": ".spec-row:contains('CCT Range') .value-start",
        "CCT End": ".spec-row:contains('CCT Range') .value-end",
        "CRI (Average)": ".spec-row[data-field='cri'] .value"
        // ... 30+ fields
      },
      "concurrency": 5,
      "delayRange": [2000, 4000],
      "retries": 3,
      "checkpointInterval": 10
    }
  }
}
```

### Action Types

| Action | Parameters | Description |
|--------|------------|-------------|
| `clickElement` | `selector`, `optional` | Clicks element; skips if missing when optional |
| `sleep` | `duration` | Waits N milliseconds |
| `scrollTo` | `selector`, `optional` | Scrolls element into viewport |
| `waitForSelector` | `selector`, `timeout` | Waits for element to appear (default 5s) |
| `type` | `selector`, `text` | Types text into input field |

## Error Handling

### Hybrid Approach

**Network Errors/Timeouts**:
- Retry up to 3 times with exponential backoff (1s, 2s, 4s)
- Log error details to scrape.log
- Mark URL as failed after max retries

**Selector Not Found**:
- Log warning with missing field name
- Save product with null value for that field
- Continue scraping (don't abort product)

**Rate Limiting Detected** (429/403):
- Pause all workers for 30 seconds
- Log incident
- Resume scraping automatically

**Context Crash**:
- Spawn replacement context
- Re-queue failed URL
- Log crash details

**Interrupted Scrape**:
- Checkpoint saves every 10 products
- On restart: Load progress.json
- Skip completed URLs, resume from queue

### Logging Strategy

- **Winston** structured logging to `scrape.log`
- Severity levels: debug, info, warning, error
- Rotate logs daily (keep 7 days)
- Real-time stream to UI log viewer

## Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Runtime | Node.js v18+ | Stable LTS, Electron requirement |
| Language | TypeScript | Type safety, better DX |
| Desktop | Electron v28+ | Cross-platform, native feel |
| Browser | patchright | Anti-detection patches for Playwright |
| Frontend | React + TypeScript | Component reusability |
| Styling | Tailwind CSS | Rapid UI development |
| State | Zustand | Lightweight, IPC-friendly |
| Logging | Winston | Production-grade logging |
| CSV Export | csv-writer | Streaming CSV writes |
| Build | electron-builder | Multi-platform packaging |

## Project Structure

```
configurable-scraper/
├── src/
│   ├── main/                      # Main process (Node.js)
│   │   ├── scraper/
│   │   │   ├── ScrapeOrchestrator.ts
│   │   │   ├── CategoryCrawler.ts
│   │   │   ├── ProductWorker.ts
│   │   │   └── ActionExecutor.ts
│   │   ├── storage/
│   │   │   ├── StorageManager.ts
│   │   │   └── CheckpointManager.ts
│   │   ├── ipc/
│   │   │   └── handlers.ts        # IPC command handlers
│   │   ├── logger.ts
│   │   └── main.ts                # Electron main entry
│   ├── renderer/                  # Renderer process (React)
│   │   ├── components/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── ConfigEditor.tsx
│   │   │   ├── LogViewer.tsx
│   │   │   └── ResultsPreview.tsx
│   │   ├── hooks/
│   │   │   ├── useScraper.ts      # IPC communication
│   │   │   └── useConfig.ts
│   │   ├── store/
│   │   │   └── scrapeStore.ts     # Zustand store
│   │   ├── App.tsx
│   │   └── index.tsx
│   └── shared/
│       ├── types.ts               # Shared TypeScript interfaces
│       ├── config-schema.ts       # JSON schema validation
│       └── ipc-channels.ts        # IPC event names
├── configs/
│   └── scraper-config.json        # User profiles
├── output/
│   ├── data.csv
│   ├── data.json
│   ├── progress.json
│   └── scrape.log
├── tests/
│   ├── unit/
│   └── integration/
├── package.json
├── tsconfig.json
├── electron-builder.yml
└── README.md
```

## Testing Strategy

### Unit Tests (Jest + ts-jest)

**ActionExecutor**:
- Test each action type with mock Playwright page
- Verify optional actions skip gracefully
- Test error handling for invalid selectors

**CheckpointManager**:
- Test save/load cycle
- Verify resume skips completed URLs
- Test corruption recovery

**ConfigValidator**:
- Test schema validation catches invalid configs
- Test profile switching logic

**Target**: 80%+ coverage for src/main/

### Integration Tests

**ScrapeOrchestrator + ProductWorker**:
- Mock HTML pages served by local server
- Test full scrape flow (category → products → export)
- Verify concurrent workers don't conflict

**CSV/JSON Export**:
- Verify output matches expected schema
- Test append mode for incremental writes
- Test null value handling

**IPC Communication**:
- Test main ↔ renderer message flow
- Verify events emitted at correct times

### Manual Testing

- Test against 2-3 real retailer sites
- Verify patchright avoids bot detection
- UI usability testing (config editor workflow)
- Test high concurrency (10 contexts)
- Test checkpoint resume after crash

### Key Test Scenarios

1. **Network timeout** → Verify retry with exponential backoff
2. **Selector not found** → Product saved with null field
3. **Rate limiting** → All workers pause, then resume
4. **Interrupted scrape** → Resume from checkpoint works
5. **10 concurrent contexts** → No file write race conditions

## Deployment

### Development Setup

```bash
npm install
npm run dev      # Starts Electron with hot reload
```

- Main process recompiles on TS changes
- Renderer uses Vite for fast HMR
- DevTools open by default

### Production Build

```bash
npm run build    # Compile TypeScript → JavaScript
npm run package  # Create installers
```

**Output**:
- macOS: `.dmg` (Universal binary: Intel + Apple Silicon)
- Windows: `.exe` installer + portable `.zip`
- Linux: `.AppImage` + `.deb`

### Bundled Assets

- Patchright Chromium binaries (bundled with app)
- Default config template with example selectors
- Quick start guide (README)

### Security

- Context isolation enabled
- Node integration disabled in renderer
- IPC channels whitelisted
- No eval() or remote code execution

### Distribution

- GitHub Releases for versioned downloads
- Auto-update (electron-updater) - optional future enhancement

## Future Enhancements (Out of Scope)

- Cloud scraping (AWS Lambda workers)
- Headless mode for CLI usage
- Proxy rotation support
- CAPTCHA solving integration
- Database export (PostgreSQL/MongoDB)
- Scrape scheduling/cron jobs

## Success Criteria

✅ Scrapes 1,000+ products from B&H Photo without detection
✅ Successfully extracts 25+ of 30 fields per product (83% field coverage)
✅ Resume from checkpoint works after interruption
✅ CSV and JSON exports validate against schema
✅ UI shows real-time progress updates
✅ Cross-platform builds run on macOS, Windows, Linux
✅ 80%+ unit test coverage for core logic
