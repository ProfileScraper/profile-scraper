# Configurable Web Scraper Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an Electron desktop app for scraping product specifications from e-commerce sites using patchright (anti-detection Playwright) with configurable selectors, concurrent processing, and CSV/JSON export.

**Architecture:** Main process handles browser automation with concurrent contexts (workers), renderer process provides React UI for config/monitoring. IPC bridge connects processes. JSON-based profiles define site-specific selectors and actions.

**Tech Stack:** Electron, TypeScript, React, patchright, Tailwind CSS, Zustand, Winston, csv-writer, Vite, Jest

---

## Task 1: Project Setup and Structure

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.main.json`
- Create: `tsconfig.renderer.json`
- Create: `.gitignore`
- Create: `electron-builder.yml`

**Step 1: Initialize npm project and create package.json**

```bash
npm init -y
```

**Step 2: Install dependencies**

```bash
npm install electron react react-dom zustand
npm install patchright winston csv-writer
npm install -D typescript @types/node @types/react @types/react-dom
npm install -D vite @vitejs/plugin-react electron-builder
npm install -D jest ts-jest @types/jest
npm install -D tailwindcss postcss autoprefixer
npm install -D concurrently wait-on
```

**Step 3: Update package.json with scripts**

Edit `package.json`:

```json
{
  "name": "configurable-scraper",
  "version": "1.0.0",
  "description": "Configurable web scraper with Electron and patchright",
  "main": "dist/main/main.js",
  "scripts": {
    "dev": "concurrently \"npm run dev:renderer\" \"npm run dev:main\"",
    "dev:renderer": "vite",
    "dev:main": "wait-on http://localhost:5173 && tsc -p tsconfig.main.json && electron .",
    "build": "npm run build:renderer && npm run build:main",
    "build:renderer": "vite build",
    "build:main": "tsc -p tsconfig.main.json",
    "test": "jest",
    "package": "npm run build && electron-builder"
  },
  "keywords": ["scraper", "electron", "patchright"],
  "author": "",
  "license": "MIT"
}
```

**Step 4: Create TypeScript configs**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "outDir": "dist"
  }
}
```

Create `tsconfig.main.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "dist/main"
  },
  "include": ["src/main/**/*", "src/shared/**/*"]
}
```

Create `tsconfig.renderer.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "lib": ["ESNext", "DOM"],
    "jsx": "react-jsx",
    "moduleResolution": "node",
    "outDir": "dist/renderer"
  },
  "include": ["src/renderer/**/*", "src/shared/**/*"]
}
```

**Step 5: Create .gitignore**

Create `.gitignore`:

```
node_modules/
dist/
output/
*.log
.DS_Store
```

**Step 6: Create directory structure**

```bash
mkdir -p src/main/scraper src/main/storage src/main/ipc
mkdir -p src/renderer/components src/renderer/hooks src/renderer/store
mkdir -p src/shared
mkdir -p tests/unit tests/integration
mkdir -p configs output docs/plans
```

**Step 7: Create electron-builder config**

Create `electron-builder.yml`:

```yaml
appId: com.configurablescraper.app
productName: Configurable Scraper
directories:
  output: release
files:
  - dist/**/*
  - node_modules/**/*
  - package.json
mac:
  target:
    - dmg
  category: public.app-category.utilities
  icon: assets/icon.icns
win:
  target:
    - nsis
    - portable
  icon: assets/icon.ico
linux:
  target:
    - AppImage
    - deb
  category: Utility
```

**Step 8: Commit initial setup**

```bash
git init
git add .
git commit -m "chore: initial project setup with TypeScript and Electron"
```

---

## Task 2: Shared Types and Schemas

**Files:**
- Create: `src/shared/types.ts`
- Create: `src/shared/config-schema.ts`
- Create: `src/shared/ipc-channels.ts`

**Step 1: Define shared TypeScript types**

Create `src/shared/types.ts`:

```typescript
export interface ScraperConfig {
  profiles: Record<string, SiteProfile>;
}

export interface SiteProfile {
  name: string;
  categoryUrl: string;
  preActions: Action[];
  pagination: PaginationConfig;
  productLinkSelector: string;
  productPageActions: Action[];
  fieldSelectors: Record<string, string>;
  concurrency: number;
  delayRange: [number, number];
  retries: number;
  checkpointInterval: number;
}

export interface PaginationConfig {
  type: 'button' | 'scroll';
  selector?: string;
  maxPages: number;
}

export interface Action {
  type: 'clickElement' | 'sleep' | 'scrollTo' | 'waitForSelector' | 'type';
  selector?: string;
  duration?: number;
  timeout?: number;
  text?: string;
  optional?: boolean;
}

export interface ProductData {
  url: string;
  scrapedAt: string;
  fields: Record<string, string | null>;
}

export interface CheckpointData {
  timestamp: string;
  profileName: string;
  completed: string[];
  pending: string[];
  totalProducts: number;
  successCount: number;
  failCount: number;
}

export interface ScrapeProgress {
  productsScraped: number;
  totalProducts: number;
  successCount: number;
  failCount: number;
  currentUrls: string[];
  eta: number | null;
}

export interface ScrapeStatus {
  isRunning: boolean;
  isPaused: boolean;
  progress: ScrapeProgress;
}
```

**Step 2: Create config schema validator**

Create `src/shared/config-schema.ts`:

```typescript
import { ScraperConfig, SiteProfile, Action } from './types';

export function validateConfig(config: unknown): config is ScraperConfig {
  if (!config || typeof config !== 'object') return false;
  const cfg = config as any;

  if (!cfg.profiles || typeof cfg.profiles !== 'object') return false;

  return Object.values(cfg.profiles).every(validateProfile);
}

function validateProfile(profile: unknown): profile is SiteProfile {
  if (!profile || typeof profile !== 'object') return false;
  const p = profile as any;

  return (
    typeof p.name === 'string' &&
    typeof p.categoryUrl === 'string' &&
    Array.isArray(p.preActions) &&
    p.preActions.every(validateAction) &&
    typeof p.productLinkSelector === 'string' &&
    Array.isArray(p.productPageActions) &&
    p.productPageActions.every(validateAction) &&
    typeof p.fieldSelectors === 'object' &&
    typeof p.concurrency === 'number' &&
    Array.isArray(p.delayRange) &&
    p.delayRange.length === 2 &&
    typeof p.retries === 'number' &&
    typeof p.checkpointInterval === 'number'
  );
}

function validateAction(action: unknown): action is Action {
  if (!action || typeof action !== 'object') return false;
  const a = action as any;

  const validTypes = ['clickElement', 'sleep', 'scrollTo', 'waitForSelector', 'type'];
  return validTypes.includes(a.type);
}
```

**Step 3: Define IPC channel names**

Create `src/shared/ipc-channels.ts`:

```typescript
export const IPC_CHANNELS = {
  // Renderer → Main
  SCRAPE_START: 'scrape:start',
  SCRAPE_PAUSE: 'scrape:pause',
  SCRAPE_RESUME: 'scrape:resume',
  SCRAPE_STOP: 'scrape:stop',
  CONFIG_LOAD: 'config:load',
  CONFIG_SAVE: 'config:save',
  EXPORT_CSV: 'export:csv',
  EXPORT_JSON: 'export:json',

  // Main → Renderer
  SCRAPE_PROGRESS: 'scrape:progress',
  SCRAPE_PRODUCT: 'scrape:product',
  SCRAPE_ERROR: 'scrape:error',
  SCRAPE_COMPLETE: 'scrape:complete',
  LOG_MESSAGE: 'log:message',
} as const;
```

**Step 4: Commit shared types**

```bash
git add src/shared/
git commit -m "feat: add shared types and schemas"
```

---

## Task 3: CheckpointManager with TDD

**Files:**
- Create: `tests/unit/CheckpointManager.test.ts`
- Create: `src/main/storage/CheckpointManager.ts`

**Step 1: Write failing test**

Create `tests/unit/CheckpointManager.test.ts`:

```typescript
import { CheckpointManager } from '../../src/main/storage/CheckpointManager';
import * as fs from 'fs';
import * as path from 'path';

const TEST_OUTPUT_DIR = path.join(__dirname, '../test-output');
const CHECKPOINT_PATH = path.join(TEST_OUTPUT_DIR, 'progress.json');

describe('CheckpointManager', () => {
  let manager: CheckpointManager;

  beforeEach(() => {
    if (fs.existsSync(TEST_OUTPUT_DIR)) {
      fs.rmSync(TEST_OUTPUT_DIR, { recursive: true });
    }
    fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
    manager = new CheckpointManager(CHECKPOINT_PATH);
  });

  afterEach(() => {
    if (fs.existsSync(TEST_OUTPUT_DIR)) {
      fs.rmSync(TEST_OUTPUT_DIR, { recursive: true });
    }
  });

  test('should initialize with empty checkpoint', () => {
    const checkpoint = manager.load();
    expect(checkpoint).toBeNull();
  });

  test('should save and load checkpoint', () => {
    const data = {
      timestamp: new Date().toISOString(),
      profileName: 'test-profile',
      completed: ['url1', 'url2'],
      pending: ['url3', 'url4'],
      totalProducts: 4,
      successCount: 2,
      failCount: 0,
    };

    manager.save(data);
    const loaded = manager.load();

    expect(loaded).toEqual(data);
  });

  test('should add completed URL', () => {
    manager.addCompleted('url1', 'test-profile');
    const checkpoint = manager.load();

    expect(checkpoint?.completed).toContain('url1');
    expect(checkpoint?.successCount).toBe(1);
  });

  test('should check if URL is completed', () => {
    manager.addCompleted('url1', 'test-profile');

    expect(manager.isCompleted('url1')).toBe(true);
    expect(manager.isCompleted('url2')).toBe(false);
  });
});
```

**Step 2: Create Jest config**

Create `jest.config.js`:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
};
```

**Step 3: Run test to verify it fails**

```bash
npm test
```

Expected output: FAIL - Cannot find module CheckpointManager

**Step 4: Write minimal implementation**

Create `src/main/storage/CheckpointManager.ts`:

```typescript
import * as fs from 'fs';
import { CheckpointData } from '../../shared/types';

export class CheckpointManager {
  private checkpointPath: string;
  private checkpoint: CheckpointData | null = null;

  constructor(checkpointPath: string) {
    this.checkpointPath = checkpointPath;
    this.checkpoint = this.load();
  }

  load(): CheckpointData | null {
    if (!fs.existsSync(this.checkpointPath)) {
      return null;
    }

    try {
      const data = fs.readFileSync(this.checkpointPath, 'utf-8');
      this.checkpoint = JSON.parse(data);
      return this.checkpoint;
    } catch (error) {
      console.error('Failed to load checkpoint:', error);
      return null;
    }
  }

  save(data: CheckpointData): void {
    const dir = require('path').dirname(this.checkpointPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(this.checkpointPath, JSON.stringify(data, null, 2));
    this.checkpoint = data;
  }

  addCompleted(url: string, profileName: string): void {
    if (!this.checkpoint) {
      this.checkpoint = {
        timestamp: new Date().toISOString(),
        profileName,
        completed: [],
        pending: [],
        totalProducts: 0,
        successCount: 0,
        failCount: 0,
      };
    }

    if (!this.checkpoint.completed.includes(url)) {
      this.checkpoint.completed.push(url);
      this.checkpoint.successCount++;
      this.checkpoint.timestamp = new Date().toISOString();
      this.save(this.checkpoint);
    }
  }

  isCompleted(url: string): boolean {
    return this.checkpoint?.completed.includes(url) ?? false;
  }

  getCompleted(): string[] {
    return this.checkpoint?.completed ?? [];
  }

  reset(): void {
    this.checkpoint = null;
    if (fs.existsSync(this.checkpointPath)) {
      fs.unlinkSync(this.checkpointPath);
    }
  }
}
```

**Step 5: Run test to verify it passes**

```bash
npm test
```

Expected output: PASS - All tests passing

**Step 6: Commit**

```bash
git add tests/unit/CheckpointManager.test.ts src/main/storage/CheckpointManager.ts jest.config.js
git commit -m "feat: add CheckpointManager with save/load functionality"
```

---

## Task 4: ActionExecutor with TDD

**Files:**
- Create: `tests/unit/ActionExecutor.test.ts`
- Create: `src/main/scraper/ActionExecutor.ts`

**Step 1: Write failing test**

Create `tests/unit/ActionExecutor.test.ts`:

```typescript
import { ActionExecutor } from '../../src/main/scraper/ActionExecutor';
import { Action } from '../../src/shared/types';

describe('ActionExecutor', () => {
  let mockPage: any;
  let executor: ActionExecutor;

  beforeEach(() => {
    mockPage = {
      click: jest.fn(),
      waitForTimeout: jest.fn(),
      locator: jest.fn(() => ({
        scrollIntoViewIfNeeded: jest.fn(),
      })),
      waitForSelector: jest.fn(),
      type: jest.fn(),
    };
    executor = new ActionExecutor();
  });

  test('should execute clickElement action', async () => {
    const action: Action = {
      type: 'clickElement',
      selector: '.button',
    };

    await executor.execute(mockPage, action);
    expect(mockPage.click).toHaveBeenCalledWith('.button');
  });

  test('should skip optional clickElement if selector not found', async () => {
    mockPage.click.mockRejectedValue(new Error('Selector not found'));

    const action: Action = {
      type: 'clickElement',
      selector: '.button',
      optional: true,
    };

    await expect(executor.execute(mockPage, action)).resolves.not.toThrow();
  });

  test('should execute sleep action', async () => {
    const action: Action = {
      type: 'sleep',
      duration: 1000,
    };

    await executor.execute(mockPage, action);
    expect(mockPage.waitForTimeout).toHaveBeenCalledWith(1000);
  });

  test('should execute scrollTo action', async () => {
    const mockLocator = { scrollIntoViewIfNeeded: jest.fn() };
    mockPage.locator.mockReturnValue(mockLocator);

    const action: Action = {
      type: 'scrollTo',
      selector: '.section',
    };

    await executor.execute(mockPage, action);
    expect(mockPage.locator).toHaveBeenCalledWith('.section');
    expect(mockLocator.scrollIntoViewIfNeeded).toHaveBeenCalled();
  });

  test('should execute waitForSelector action', async () => {
    const action: Action = {
      type: 'waitForSelector',
      selector: '.loaded',
      timeout: 5000,
    };

    await executor.execute(mockPage, action);
    expect(mockPage.waitForSelector).toHaveBeenCalledWith('.loaded', { timeout: 5000 });
  });

  test('should execute type action', async () => {
    const action: Action = {
      type: 'type',
      selector: 'input',
      text: 'hello',
    };

    await executor.execute(mockPage, action);
    expect(mockPage.type).toHaveBeenCalledWith('input', 'hello');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL - Cannot find module ActionExecutor

**Step 3: Write minimal implementation**

Create `src/main/scraper/ActionExecutor.ts`:

```typescript
import { Action } from '../../shared/types';
import { Page } from 'patchright';

export class ActionExecutor {
  async execute(page: Page, action: Action): Promise<void> {
    try {
      switch (action.type) {
        case 'clickElement':
          await page.click(action.selector!);
          break;

        case 'sleep':
          await page.waitForTimeout(action.duration!);
          break;

        case 'scrollTo':
          await page.locator(action.selector!).scrollIntoViewIfNeeded();
          break;

        case 'waitForSelector':
          await page.waitForSelector(action.selector!, {
            timeout: action.timeout ?? 5000,
          });
          break;

        case 'type':
          await page.type(action.selector!, action.text!);
          break;

        default:
          throw new Error(`Unknown action type: ${(action as any).type}`);
      }
    } catch (error) {
      if (action.optional) {
        console.log(`Optional action failed, continuing: ${action.type}`);
        return;
      }
      throw error;
    }
  }

  async executeSequence(page: Page, actions: Action[]): Promise<void> {
    for (const action of actions) {
      await this.execute(page, action);
    }
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npm test
```

Expected: PASS

**Step 5: Commit**

```bash
git add tests/unit/ActionExecutor.test.ts src/main/scraper/ActionExecutor.ts
git commit -m "feat: add ActionExecutor for browser actions"
```

---

## Task 5: StorageManager with TDD

**Files:**
- Create: `tests/unit/StorageManager.test.ts`
- Create: `src/main/storage/StorageManager.ts`

**Step 1: Write failing test**

Create `tests/unit/StorageManager.test.ts`:

```typescript
import { StorageManager } from '../../src/main/storage/StorageManager';
import { ProductData } from '../../src/shared/types';
import * as fs from 'fs';
import * as path from 'path';

const TEST_OUTPUT_DIR = path.join(__dirname, '../test-output');

describe('StorageManager', () => {
  let manager: StorageManager;

  beforeEach(() => {
    if (fs.existsSync(TEST_OUTPUT_DIR)) {
      fs.rmSync(TEST_OUTPUT_DIR, { recursive: true });
    }
    fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
    manager = new StorageManager(TEST_OUTPUT_DIR);
  });

  afterEach(() => {
    if (fs.existsSync(TEST_OUTPUT_DIR)) {
      fs.rmSync(TEST_OUTPUT_DIR, { recursive: true });
    }
  });

  test('should initialize output directory', () => {
    expect(fs.existsSync(TEST_OUTPUT_DIR)).toBe(true);
  });

  test('should save product to JSON', async () => {
    const product: ProductData = {
      url: 'https://example.com/product1',
      scrapedAt: new Date().toISOString(),
      fields: {
        Brand: 'Aputure',
        Model: 'Nova P300c',
        'CCT Start': '2000',
      },
    };

    await manager.saveProduct(product);

    const jsonPath = path.join(TEST_OUTPUT_DIR, 'data.json');
    expect(fs.existsSync(jsonPath)).toBe(true);

    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    expect(data).toHaveLength(1);
    expect(data[0]).toEqual(product);
  });

  test('should append multiple products to JSON', async () => {
    const product1: ProductData = {
      url: 'https://example.com/product1',
      scrapedAt: new Date().toISOString(),
      fields: { Brand: 'Aputure' },
    };

    const product2: ProductData = {
      url: 'https://example.com/product2',
      scrapedAt: new Date().toISOString(),
      fields: { Brand: 'ARRI' },
    };

    await manager.saveProduct(product1);
    await manager.saveProduct(product2);

    const jsonPath = path.join(TEST_OUTPUT_DIR, 'data.json');
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

    expect(data).toHaveLength(2);
    expect(data[0]).toEqual(product1);
    expect(data[1]).toEqual(product2);
  });

  test('should save product to CSV', async () => {
    const product: ProductData = {
      url: 'https://example.com/product1',
      scrapedAt: new Date().toISOString(),
      fields: {
        Brand: 'Aputure',
        Model: 'Nova P300c',
        'CCT Start': '2000',
      },
    };

    await manager.saveProduct(product);

    const csvPath = path.join(TEST_OUTPUT_DIR, 'data.csv');
    expect(fs.existsSync(csvPath)).toBe(true);

    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    expect(csvContent).toContain('Brand,Model,CCT Start,url,scrapedAt');
    expect(csvContent).toContain('Aputure,Nova P300c,2000');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL - Cannot find module StorageManager

**Step 3: Write minimal implementation**

Create `src/main/storage/StorageManager.ts`:

```typescript
import * as fs from 'fs';
import * as path from 'path';
import { ProductData } from '../../shared/types';
import { createObjectCsvWriter } from 'csv-writer';

export class StorageManager {
  private outputDir: string;
  private jsonPath: string;
  private csvPath: string;
  private products: ProductData[] = [];
  private csvWriter: any;
  private csvInitialized = false;

  constructor(outputDir: string) {
    this.outputDir = outputDir;
    this.jsonPath = path.join(outputDir, 'data.json');
    this.csvPath = path.join(outputDir, 'data.csv');

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Load existing data if present
    if (fs.existsSync(this.jsonPath)) {
      const data = fs.readFileSync(this.jsonPath, 'utf-8');
      this.products = JSON.parse(data);
    }
  }

  async saveProduct(product: ProductData): Promise<void> {
    this.products.push(product);

    // Save to JSON
    fs.writeFileSync(this.jsonPath, JSON.stringify(this.products, null, 2));

    // Save to CSV
    await this.appendToCSV(product);
  }

  private async appendToCSV(product: ProductData): Promise<void> {
    // Get all unique field keys across all products
    const allFields = new Set<string>();
    this.products.forEach(p => {
      Object.keys(p.fields).forEach(key => allFields.add(key));
    });

    const headers = [
      ...Array.from(allFields).sort(),
      'url',
      'scrapedAt',
    ];

    if (!this.csvInitialized) {
      // Create CSV with headers
      this.csvWriter = createObjectCsvWriter({
        path: this.csvPath,
        header: headers.map(h => ({ id: h, title: h })),
      });
      this.csvInitialized = true;

      // Write all products (including new one)
      const records = this.products.map(p => ({
        ...p.fields,
        url: p.url,
        scrapedAt: p.scrapedAt,
      }));

      await this.csvWriter.writeRecords(records);
    } else {
      // Append mode: write only the new product
      this.csvWriter = createObjectCsvWriter({
        path: this.csvPath,
        header: headers.map(h => ({ id: h, title: h })),
        append: true,
      });

      const record = {
        ...product.fields,
        url: product.url,
        scrapedAt: product.scrapedAt,
      };

      await this.csvWriter.writeRecords([record]);
    }
  }

  getProducts(): ProductData[] {
    return this.products;
  }

  clear(): void {
    this.products = [];
    if (fs.existsSync(this.jsonPath)) {
      fs.unlinkSync(this.jsonPath);
    }
    if (fs.existsSync(this.csvPath)) {
      fs.unlinkSync(this.csvPath);
    }
    this.csvInitialized = false;
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npm test
```

Expected: PASS

**Step 5: Commit**

```bash
git add tests/unit/StorageManager.test.ts src/main/storage/StorageManager.ts
git commit -m "feat: add StorageManager for CSV/JSON export"
```

---

## Task 6: Logger Setup

**Files:**
- Create: `src/main/logger.ts`

**Step 1: Create Winston logger**

Create `src/main/logger.ts`:

```typescript
import * as winston from 'winston';
import * as path from 'path';

const logDir = path.join(process.cwd(), 'output');

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'scrape.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 7,
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

export function logInfo(message: string, meta?: any): void {
  logger.info(message, meta);
}

export function logError(message: string, error?: Error, meta?: any): void {
  logger.error(message, { error: error?.message, stack: error?.stack, ...meta });
}

export function logWarning(message: string, meta?: any): void {
  logger.warn(message, meta);
}
```

**Step 2: Commit**

```bash
git add src/main/logger.ts
git commit -m "feat: add Winston logger configuration"
```

---

## Task 7: ProductWorker with TDD

**Files:**
- Create: `tests/unit/ProductWorker.test.ts`
- Create: `src/main/scraper/ProductWorker.ts`

**Step 1: Write failing test**

Create `tests/unit/ProductWorker.test.ts`:

```typescript
import { ProductWorker } from '../../src/main/scraper/ProductWorker';
import { SiteProfile } from '../../src/shared/types';

describe('ProductWorker', () => {
  let mockContext: any;
  let mockPage: any;
  let worker: ProductWorker;
  let profile: SiteProfile;

  beforeEach(() => {
    mockPage = {
      goto: jest.fn(),
      locator: jest.fn(() => ({
        textContent: jest.fn().mockResolvedValue('Test Value'),
        scrollIntoViewIfNeeded: jest.fn(),
      })),
      click: jest.fn(),
      waitForTimeout: jest.fn(),
      close: jest.fn(),
    };

    mockContext = {
      newPage: jest.fn().mockResolvedValue(mockPage),
    };

    profile = {
      name: 'test-profile',
      categoryUrl: 'https://example.com/category',
      preActions: [],
      pagination: { type: 'button', maxPages: 1 },
      productLinkSelector: '.product a',
      productPageActions: [],
      fieldSelectors: {
        Brand: '.brand',
        Model: '.model',
      },
      concurrency: 1,
      delayRange: [100, 200],
      retries: 3,
      checkpointInterval: 10,
    };

    worker = new ProductWorker(mockContext, profile);
  });

  test('should scrape product page', async () => {
    const url = 'https://example.com/product1';
    const product = await worker.scrape(url);

    expect(mockPage.goto).toHaveBeenCalledWith(url, { waitUntil: 'domcontentloaded' });
    expect(product.url).toBe(url);
    expect(product.fields.Brand).toBe('Test Value');
    expect(product.fields.Model).toBe('Test Value');
  });

  test('should handle missing fields as null', async () => {
    mockPage.locator.mockReturnValue({
      textContent: jest.fn().mockRejectedValue(new Error('Not found')),
    });

    const url = 'https://example.com/product1';
    const product = await worker.scrape(url);

    expect(product.fields.Brand).toBeNull();
    expect(product.fields.Model).toBeNull();
  });

  test('should apply random delay', async () => {
    const url = 'https://example.com/product1';
    await worker.scrape(url);

    expect(mockPage.waitForTimeout).toHaveBeenCalled();
    const delay = mockPage.waitForTimeout.mock.calls[0][0];
    expect(delay).toBeGreaterThanOrEqual(100);
    expect(delay).toBeLessThanOrEqual(200);
  });

  test('should retry on failure', async () => {
    mockPage.goto.mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(undefined);

    const url = 'https://example.com/product1';
    const product = await worker.scrape(url);

    expect(mockPage.goto).toHaveBeenCalledTimes(3);
    expect(product.url).toBe(url);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL - Cannot find module ProductWorker

**Step 3: Write minimal implementation**

Create `src/main/scraper/ProductWorker.ts`:

```typescript
import { BrowserContext, Page } from 'patchright';
import { ProductData, SiteProfile } from '../../shared/types';
import { ActionExecutor } from './ActionExecutor';
import { logError, logInfo, logWarning } from '../logger';

export class ProductWorker {
  private context: BrowserContext;
  private profile: SiteProfile;
  private actionExecutor: ActionExecutor;
  private page: Page | null = null;

  constructor(context: BrowserContext, profile: SiteProfile) {
    this.context = context;
    this.profile = profile;
    this.actionExecutor = new ActionExecutor();
  }

  async scrape(url: string): Promise<ProductData> {
    const product: ProductData = {
      url,
      scrapedAt: new Date().toISOString(),
      fields: {},
    };

    let attempt = 0;
    const maxRetries = this.profile.retries;

    while (attempt < maxRetries) {
      try {
        // Create new page if needed
        if (!this.page) {
          this.page = await this.context.newPage();
        }

        // Navigate to product page
        await this.page.goto(url, { waitUntil: 'domcontentloaded' });
        logInfo(`Navigated to ${url}`);

        // Execute product page actions
        await this.actionExecutor.executeSequence(this.page, this.profile.productPageActions);

        // Extract fields
        for (const [fieldName, selector] of Object.entries(this.profile.fieldSelectors)) {
          try {
            const element = this.page.locator(selector);
            const value = await element.textContent();
            product.fields[fieldName] = value?.trim() || null;
          } catch (error) {
            logWarning(`Field ${fieldName} not found for ${url}`, { selector });
            product.fields[fieldName] = null;
          }
        }

        // Random delay
        const [min, max] = this.profile.delayRange;
        const delay = Math.floor(Math.random() * (max - min + 1)) + min;
        await this.page.waitForTimeout(delay);

        return product;
      } catch (error) {
        attempt++;
        logError(`Scrape attempt ${attempt} failed for ${url}`, error as Error);

        if (attempt >= maxRetries) {
          throw error;
        }

        // Exponential backoff
        const backoff = Math.pow(2, attempt) * 1000;
        await this.page?.waitForTimeout(backoff);
      }
    }

    return product;
  }

  async close(): Promise<void> {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npm test
```

Expected: PASS

**Step 5: Commit**

```bash
git add tests/unit/ProductWorker.test.ts src/main/scraper/ProductWorker.ts
git commit -m "feat: add ProductWorker for scraping product pages"
```

---

## Task 8: CategoryCrawler with TDD

**Files:**
- Create: `tests/unit/CategoryCrawler.test.ts`
- Create: `src/main/scraper/CategoryCrawler.ts`

**Step 1: Write failing test**

Create `tests/unit/CategoryCrawler.test.ts`:

```typescript
import { CategoryCrawler } from '../../src/main/scraper/CategoryCrawler';
import { SiteProfile } from '../../src/shared/types';

describe('CategoryCrawler', () => {
  let mockPage: any;
  let crawler: CategoryCrawler;
  let profile: SiteProfile;

  beforeEach(() => {
    mockPage = {
      goto: jest.fn(),
      locator: jest.fn(),
      click: jest.fn(),
      evaluate: jest.fn(),
    };

    profile = {
      name: 'test',
      categoryUrl: 'https://example.com/category',
      preActions: [],
      pagination: {
        type: 'button',
        selector: '.next',
        maxPages: 2,
      },
      productLinkSelector: '.product a',
      productPageActions: [],
      fieldSelectors: {},
      concurrency: 1,
      delayRange: [0, 0],
      retries: 1,
      checkpointInterval: 10,
    };

    crawler = new CategoryCrawler(mockPage, profile);
  });

  test('should extract product URLs from category page', async () => {
    const mockLinks = [
      { getAttribute: jest.fn().mockResolvedValue('https://example.com/product1') },
      { getAttribute: jest.fn().mockResolvedValue('https://example.com/product2') },
    ];

    mockPage.locator.mockReturnValue({
      all: jest.fn().mockResolvedValue(mockLinks),
    });

    const urls = await crawler.extractProductUrls();

    expect(urls).toEqual([
      'https://example.com/product1',
      'https://example.com/product2',
    ]);
  });

  test('should handle pagination', async () => {
    const mockLinks1 = [
      { getAttribute: jest.fn().mockResolvedValue('https://example.com/product1') },
    ];
    const mockLinks2 = [
      { getAttribute: jest.fn().mockResolvedValue('https://example.com/product3') },
    ];

    mockPage.locator
      .mockReturnValueOnce({ all: jest.fn().mockResolvedValue(mockLinks1) })
      .mockReturnValueOnce({ all: jest.fn().mockResolvedValue(mockLinks2) });

    mockPage.click.mockResolvedValue(undefined);

    const urls = await crawler.crawl();

    expect(urls.length).toBeGreaterThan(0);
    expect(mockPage.click).toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL

**Step 3: Write minimal implementation**

Create `src/main/scraper/CategoryCrawler.ts`:

```typescript
import { Page } from 'patchright';
import { SiteProfile } from '../../shared/types';
import { ActionExecutor } from './ActionExecutor';
import { logInfo } from '../logger';

export class CategoryCrawler {
  private page: Page;
  private profile: SiteProfile;
  private actionExecutor: ActionExecutor;

  constructor(page: Page, profile: SiteProfile) {
    this.page = page;
    this.profile = profile;
    this.actionExecutor = new ActionExecutor();
  }

  async crawl(): Promise<string[]> {
    const allUrls = new Set<string>();

    // Navigate to category page
    await this.page.goto(this.profile.categoryUrl, { waitUntil: 'domcontentloaded' });
    logInfo(`Navigated to category: ${this.profile.categoryUrl}`);

    // Execute pre-actions
    await this.actionExecutor.executeSequence(this.page, this.profile.preActions);

    let pageCount = 0;
    const maxPages = this.profile.pagination.maxPages;

    while (pageCount < maxPages) {
      // Extract product URLs from current page
      const urls = await this.extractProductUrls();
      urls.forEach(url => allUrls.add(url));

      logInfo(`Page ${pageCount + 1}: Found ${urls.length} products`);

      pageCount++;

      // Try to go to next page
      if (pageCount < maxPages) {
        const hasNext = await this.goToNextPage();
        if (!hasNext) {
          logInfo('No more pages to crawl');
          break;
        }
      }
    }

    return Array.from(allUrls);
  }

  async extractProductUrls(): Promise<string[]> {
    const elements = await this.page.locator(this.profile.productLinkSelector).all();
    const urls: string[] = [];

    for (const element of elements) {
      const href = await element.getAttribute('href');
      if (href) {
        // Make absolute URL if relative
        const absoluteUrl = new URL(href, this.profile.categoryUrl).toString();
        urls.push(absoluteUrl);
      }
    }

    return urls;
  }

  private async goToNextPage(): Promise<boolean> {
    if (this.profile.pagination.type === 'button' && this.profile.pagination.selector) {
      try {
        await this.page.click(this.profile.pagination.selector);
        await this.page.waitForTimeout(2000); // Wait for page load
        return true;
      } catch (error) {
        return false;
      }
    }

    return false;
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npm test
```

Expected: PASS

**Step 5: Commit**

```bash
git add tests/unit/CategoryCrawler.test.ts src/main/scraper/CategoryCrawler.ts
git commit -m "feat: add CategoryCrawler for extracting product URLs"
```

---

## Task 9: ScrapeOrchestrator

**Files:**
- Create: `src/main/scraper/ScrapeOrchestrator.ts`

**Step 1: Write implementation** (Integration tested)

Create `src/main/scraper/ScrapeOrchestrator.ts`:

```typescript
import { chromium, Browser, BrowserContext } from 'patchright';
import { SiteProfile, ProductData, ScrapeProgress } from '../../shared/types';
import { CategoryCrawler } from './CategoryCrawler';
import { ProductWorker } from './ProductWorker';
import { StorageManager } from '../storage/StorageManager';
import { CheckpointManager } from '../storage/CheckpointManager';
import { logInfo, logError } from '../logger';
import { EventEmitter } from 'events';

export class ScrapeOrchestrator extends EventEmitter {
  private browser: Browser | null = null;
  private contexts: BrowserContext[] = [];
  private workers: ProductWorker[] = [];
  private profile: SiteProfile;
  private storageManager: StorageManager;
  private checkpointManager: CheckpointManager;
  private productQueue: string[] = [];
  private processing: Set<string> = new Set();
  private isRunning = false;
  private isPaused = false;
  private successCount = 0;
  private failCount = 0;

  constructor(
    profile: SiteProfile,
    outputDir: string,
    checkpointPath: string
  ) {
    super();
    this.profile = profile;
    this.storageManager = new StorageManager(outputDir);
    this.checkpointManager = new CheckpointManager(checkpointPath);
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Scraper is already running');
    }

    this.isRunning = true;
    this.isPaused = false;
    logInfo('Starting scraper');

    try {
      // Launch browser
      this.browser = await chromium.launch({ headless: false });
      logInfo('Browser launched');

      // Check for existing checkpoint
      const checkpoint = this.checkpointManager.load();
      let productUrls: string[];

      if (checkpoint && checkpoint.pending.length > 0) {
        logInfo(`Resuming from checkpoint: ${checkpoint.pending.length} products remaining`);
        productUrls = checkpoint.pending;
        this.successCount = checkpoint.successCount;
        this.failCount = checkpoint.failCount;
      } else {
        // Fresh start: crawl category pages
        const crawlerContext = await this.browser.newContext();
        const crawlerPage = await crawlerContext.newPage();
        const crawler = new CategoryCrawler(crawlerPage, this.profile);

        productUrls = await crawler.crawl();
        await crawlerPage.close();
        await crawlerContext.close();

        logInfo(`Found ${productUrls.length} products to scrape`);
      }

      this.productQueue = productUrls;

      // Create worker contexts
      for (let i = 0; i < this.profile.concurrency; i++) {
        const context = await this.browser.newContext();
        this.contexts.push(context);

        const worker = new ProductWorker(context, this.profile);
        this.workers.push(worker);
      }

      // Start processing
      await this.processQueue();

      this.emit('complete', {
        successCount: this.successCount,
        failCount: this.failCount,
      });

      logInfo('Scraping complete');
    } catch (error) {
      logError('Scraping failed', error as Error);
      this.emit('error', error);
    } finally {
      await this.cleanup();
    }
  }

  private async processQueue(): Promise<void> {
    const workerPromises: Promise<void>[] = [];

    for (const worker of this.workers) {
      workerPromises.push(this.workerLoop(worker));
    }

    await Promise.all(workerPromises);
  }

  private async workerLoop(worker: ProductWorker): Promise<void> {
    while (this.productQueue.length > 0 && this.isRunning) {
      // Handle pause
      while (this.isPaused && this.isRunning) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (!this.isRunning) break;

      const url = this.productQueue.shift();
      if (!url) break;

      // Skip if already completed
      if (this.checkpointManager.isCompleted(url)) {
        continue;
      }

      this.processing.add(url);
      this.emitProgress();

      try {
        const product = await worker.scrape(url);
        await this.storageManager.saveProduct(product);
        this.checkpointManager.addCompleted(url, this.profile.name);
        this.successCount++;

        this.emit('product', product);
        logInfo(`Scraped: ${url}`);
      } catch (error) {
        this.failCount++;
        logError(`Failed to scrape: ${url}`, error as Error);
        this.emit('error', { url, error });
      } finally {
        this.processing.delete(url);
        this.emitProgress();

        // Checkpoint every N products
        if ((this.successCount + this.failCount) % this.profile.checkpointInterval === 0) {
          this.saveCheckpoint();
        }
      }
    }
  }

  private emitProgress(): void {
    const progress: ScrapeProgress = {
      productsScraped: this.successCount,
      totalProducts: this.successCount + this.failCount + this.productQueue.length + this.processing.size,
      successCount: this.successCount,
      failCount: this.failCount,
      currentUrls: Array.from(this.processing),
      eta: this.calculateETA(),
    };

    this.emit('progress', progress);
  }

  private calculateETA(): number | null {
    // Simple ETA calculation (can be improved)
    if (this.successCount === 0) return null;

    const remaining = this.productQueue.length;
    const avgTimePerProduct = 5000; // Assume 5s per product
    return remaining * avgTimePerProduct;
  }

  private saveCheckpoint(): void {
    this.checkpointManager.save({
      timestamp: new Date().toISOString(),
      profileName: this.profile.name,
      completed: this.checkpointManager.getCompleted(),
      pending: this.productQueue,
      totalProducts: this.successCount + this.failCount + this.productQueue.length,
      successCount: this.successCount,
      failCount: this.failCount,
    });
    logInfo('Checkpoint saved');
  }

  pause(): void {
    this.isPaused = true;
    logInfo('Scraper paused');
  }

  resume(): void {
    this.isPaused = false;
    logInfo('Scraper resumed');
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    this.saveCheckpoint();
    await this.cleanup();
    logInfo('Scraper stopped');
  }

  private async cleanup(): Promise<void> {
    for (const worker of this.workers) {
      await worker.close();
    }

    for (const context of this.contexts) {
      await context.close();
    }

    if (this.browser) {
      await this.browser.close();
    }

    this.workers = [];
    this.contexts = [];
    this.browser = null;
    this.isRunning = false;
  }
}
```

**Step 2: Commit**

```bash
git add src/main/scraper/ScrapeOrchestrator.ts
git commit -m "feat: add ScrapeOrchestrator for managing concurrent scraping"
```

---

## Task 10: IPC Handlers

**Files:**
- Create: `src/main/ipc/handlers.ts`

**Step 1: Create IPC handlers**

Create `src/main/ipc/handlers.ts`:

```typescript
import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import { ScrapeOrchestrator } from '../scraper/ScrapeOrchestrator';
import { ScraperConfig, SiteProfile } from '../../shared/types';
import { validateConfig } from '../../shared/config-schema';
import * as fs from 'fs';
import * as path from 'path';

let orchestrator: ScrapeOrchestrator | null = null;

export function setupIpcHandlers(mainWindow: Electron.BrowserWindow): void {
  // Load config
  ipcMain.handle(IPC_CHANNELS.CONFIG_LOAD, async () => {
    const configPath = path.join(process.cwd(), 'configs', 'scraper-config.json');

    if (!fs.existsSync(configPath)) {
      return null;
    }

    const data = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(data);

    if (!validateConfig(config)) {
      throw new Error('Invalid config format');
    }

    return config;
  });

  // Save config
  ipcMain.handle(IPC_CHANNELS.CONFIG_SAVE, async (event: IpcMainInvokeEvent, config: ScraperConfig) => {
    if (!validateConfig(config)) {
      throw new Error('Invalid config format');
    }

    const configPath = path.join(process.cwd(), 'configs', 'scraper-config.json');
    const dir = path.dirname(configPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return { success: true };
  });

  // Start scraping
  ipcMain.handle(IPC_CHANNELS.SCRAPE_START, async (event: IpcMainInvokeEvent, profileName: string) => {
    const configPath = path.join(process.cwd(), 'configs', 'scraper-config.json');
    const data = fs.readFileSync(configPath, 'utf-8');
    const config: ScraperConfig = JSON.parse(data);

    const profile = config.profiles[profileName];
    if (!profile) {
      throw new Error(`Profile not found: ${profileName}`);
    }

    const outputDir = path.join(process.cwd(), 'output');
    const checkpointPath = path.join(outputDir, 'progress.json');

    orchestrator = new ScrapeOrchestrator(profile, outputDir, checkpointPath);

    // Forward events to renderer
    orchestrator.on('progress', (progress) => {
      mainWindow.webContents.send(IPC_CHANNELS.SCRAPE_PROGRESS, progress);
    });

    orchestrator.on('product', (product) => {
      mainWindow.webContents.send(IPC_CHANNELS.SCRAPE_PRODUCT, product);
    });

    orchestrator.on('error', (error) => {
      mainWindow.webContents.send(IPC_CHANNELS.SCRAPE_ERROR, error);
    });

    orchestrator.on('complete', (stats) => {
      mainWindow.webContents.send(IPC_CHANNELS.SCRAPE_COMPLETE, stats);
    });

    // Start scraping (non-blocking)
    orchestrator.start().catch(error => {
      mainWindow.webContents.send(IPC_CHANNELS.SCRAPE_ERROR, error);
    });

    return { success: true };
  });

  // Pause scraping
  ipcMain.handle(IPC_CHANNELS.SCRAPE_PAUSE, async () => {
    if (orchestrator) {
      orchestrator.pause();
    }
    return { success: true };
  });

  // Resume scraping
  ipcMain.handle(IPC_CHANNELS.SCRAPE_RESUME, async () => {
    if (orchestrator) {
      orchestrator.resume();
    }
    return { success: true };
  });

  // Stop scraping
  ipcMain.handle(IPC_CHANNELS.SCRAPE_STOP, async () => {
    if (orchestrator) {
      await orchestrator.stop();
      orchestrator = null;
    }
    return { success: true };
  });
}
```

**Step 2: Commit**

```bash
git add src/main/ipc/handlers.ts
git commit -m "feat: add IPC handlers for Electron communication"
```

---

## Task 11: Electron Main Process

**Files:**
- Create: `src/main/main.ts`

**Step 1: Create Electron main entry**

Create `src/main/main.ts`:

```typescript
import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { setupIpcHandlers } from './ipc/handlers';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // In development, load from Vite dev server
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from built files
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  setupIpcHandlers(mainWindow);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
```

**Step 2: Create preload script**

Create `src/main/preload.ts`:

```typescript
import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/ipc-channels';

contextBridge.exposeInMainWorld('electronAPI', {
  // Config
  loadConfig: () => ipcRenderer.invoke(IPC_CHANNELS.CONFIG_LOAD),
  saveConfig: (config: any) => ipcRenderer.invoke(IPC_CHANNELS.CONFIG_SAVE, config),

  // Scraping controls
  startScrape: (profileName: string) => ipcRenderer.invoke(IPC_CHANNELS.SCRAPE_START, profileName),
  pauseScrape: () => ipcRenderer.invoke(IPC_CHANNELS.SCRAPE_PAUSE),
  resumeScrape: () => ipcRenderer.invoke(IPC_CHANNELS.SCRAPE_RESUME),
  stopScrape: () => ipcRenderer.invoke(IPC_CHANNELS.SCRAPE_STOP),

  // Event listeners
  onProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on(IPC_CHANNELS.SCRAPE_PROGRESS, (_, data) => callback(data));
  },
  onProduct: (callback: (product: any) => void) => {
    ipcRenderer.on(IPC_CHANNELS.SCRAPE_PRODUCT, (_, data) => callback(data));
  },
  onError: (callback: (error: any) => void) => {
    ipcRenderer.on(IPC_CHANNELS.SCRAPE_ERROR, (_, data) => callback(data));
  },
  onComplete: (callback: (stats: any) => void) => {
    ipcRenderer.on(IPC_CHANNELS.SCRAPE_COMPLETE, (_, data) => callback(data));
  },
});
```

**Step 3: Add type definitions for renderer**

Create `src/renderer/electron.d.ts`:

```typescript
export interface ElectronAPI {
  loadConfig: () => Promise<any>;
  saveConfig: (config: any) => Promise<any>;
  startScrape: (profileName: string) => Promise<any>;
  pauseScrape: () => Promise<any>;
  resumeScrape: () => Promise<any>;
  stopScrape: () => Promise<any>;
  onProgress: (callback: (progress: any) => void) => void;
  onProduct: (callback: (product: any) => void) => void;
  onError: (callback: (error: any) => void) => void;
  onComplete: (callback: (stats: any) => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
```

**Step 4: Commit**

```bash
git add src/main/main.ts src/main/preload.ts src/renderer/electron.d.ts
git commit -m "feat: add Electron main process and preload script"
```

---

## Task 12: React UI Setup

**Files:**
- Create: `src/renderer/store/scrapeStore.ts`
- Create: `src/renderer/hooks/useScraper.ts`
- Create: `vite.config.ts`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`

**Step 1: Create Zustand store**

Create `src/renderer/store/scrapeStore.ts`:

```typescript
import { create } from 'zustand';
import { ScrapeProgress, ProductData } from '../../shared/types';

interface ScrapeState {
  isRunning: boolean;
  isPaused: boolean;
  progress: ScrapeProgress | null;
  products: ProductData[];
  errors: any[];
  setRunning: (running: boolean) => void;
  setPaused: (paused: boolean) => void;
  setProgress: (progress: ScrapeProgress) => void;
  addProduct: (product: ProductData) => void;
  addError: (error: any) => void;
  reset: () => void;
}

export const useScrapeStore = create<ScrapeState>((set) => ({
  isRunning: false,
  isPaused: false,
  progress: null,
  products: [],
  errors: [],
  setRunning: (running) => set({ isRunning: running }),
  setPaused: (paused) => set({ isPaused: paused }),
  setProgress: (progress) => set({ progress }),
  addProduct: (product) => set((state) => ({ products: [...state.products, product] })),
  addError: (error) => set((state) => ({ errors: [...state.errors, error] })),
  reset: () => set({ products: [], errors: [], progress: null }),
}));
```

**Step 2: Create scraper hook**

Create `src/renderer/hooks/useScraper.ts`:

```typescript
import { useEffect } from 'react';
import { useScrapeStore } from '../store/scrapeStore';

export function useScraper() {
  const store = useScrapeStore();

  useEffect(() => {
    // Set up IPC listeners
    window.electronAPI.onProgress((progress) => {
      store.setProgress(progress);
    });

    window.electronAPI.onProduct((product) => {
      store.addProduct(product);
    });

    window.electronAPI.onError((error) => {
      store.addError(error);
    });

    window.electronAPI.onComplete((stats) => {
      store.setRunning(false);
      console.log('Scraping complete:', stats);
    });
  }, []);

  const startScrape = async (profileName: string) => {
    store.reset();
    store.setRunning(true);
    await window.electronAPI.startScrape(profileName);
  };

  const pauseScrape = async () => {
    store.setPaused(true);
    await window.electronAPI.pauseScrape();
  };

  const resumeScrape = async () => {
    store.setPaused(false);
    await window.electronAPI.resumeScrape();
  };

  const stopScrape = async () => {
    await window.electronAPI.stopScrape();
    store.setRunning(false);
  };

  return {
    ...store,
    startScrape,
    pauseScrape,
    resumeScrape,
    stopScrape,
  };
}
```

**Step 3: Create Vite config**

Create `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist/renderer',
  },
  server: {
    port: 5173,
  },
});
```

**Step 4: Create Tailwind config**

```bash
npx tailwindcss init -p
```

Edit `tailwind.config.js`:

```javascript
module.exports = {
  content: ['./src/renderer/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

**Step 5: Commit**

```bash
git add src/renderer/store/ src/renderer/hooks/ vite.config.ts tailwind.config.js postcss.config.js
git commit -m "feat: add React setup with Zustand and Vite"
```

---

## Task 13: Dashboard Component

**Files:**
- Create: `src/renderer/components/Dashboard.tsx`
- Create: `src/renderer/styles/index.css`

**Step 1: Create Tailwind CSS entry**

Create `src/renderer/styles/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Step 2: Create Dashboard component**

Create `src/renderer/components/Dashboard.tsx`:

```typescript
import React from 'react';
import { useScraper } from '../hooks/useScraper';

export function Dashboard() {
  const {
    isRunning,
    isPaused,
    progress,
    startScrape,
    pauseScrape,
    resumeScrape,
    stopScrape,
  } = useScraper();

  const [profileName, setProfileName] = React.useState('b&h-photo');

  const handleStart = () => {
    startScrape(profileName);
  };

  const percentage = progress
    ? Math.round((progress.productsScraped / progress.totalProducts) * 100)
    : 0;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Web Scraper Dashboard</h1>

      {/* Controls */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Controls</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Profile</label>
          <input
            type="text"
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            className="border rounded px-3 py-2 w-full"
            disabled={isRunning}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleStart}
            disabled={isRunning}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Start
          </button>

          {isRunning && !isPaused && (
            <button
              onClick={pauseScrape}
              className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
            >
              Pause
            </button>
          )}

          {isRunning && isPaused && (
            <button
              onClick={resumeScrape}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Resume
            </button>
          )}

          {isRunning && (
            <button
              onClick={stopScrape}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Stop
            </button>
          )}
        </div>
      </div>

      {/* Progress */}
      {progress && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Progress</h2>

          <div className="mb-4">
            <div className="flex justify-between mb-2">
              <span>Products Scraped</span>
              <span className="font-semibold">
                {progress.productsScraped} / {progress.totalProducts}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-blue-500 h-4 rounded-full transition-all"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="text-center mt-1 text-sm text-gray-600">{percentage}%</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600">Success</div>
              <div className="text-2xl font-bold text-green-600">{progress.successCount}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Failed</div>
              <div className="text-2xl font-bold text-red-600">{progress.failCount}</div>
            </div>
          </div>

          {progress.currentUrls.length > 0 && (
            <div className="mt-4">
              <div className="text-sm font-medium mb-2">Currently Processing:</div>
              <div className="text-xs text-gray-600 space-y-1">
                {progress.currentUrls.map((url, i) => (
                  <div key={i} className="truncate">{url}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/renderer/components/Dashboard.tsx src/renderer/styles/index.css
git commit -m "feat: add Dashboard component with progress tracking"
```

---

## Task 14: Main App Component

**Files:**
- Create: `src/renderer/App.tsx`
- Create: `src/renderer/index.tsx`
- Create: `index.html`

**Step 1: Create App component**

Create `src/renderer/App.tsx`:

```typescript
import React from 'react';
import { Dashboard } from './components/Dashboard';
import './styles/index.css';

export function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Dashboard />
    </div>
  );
}
```

**Step 2: Create renderer entry**

Create `src/renderer/index.tsx`:

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**Step 3: Create HTML template**

Create `index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Configurable Scraper</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/renderer/index.tsx"></script>
  </body>
</html>
```

**Step 4: Commit**

```bash
git add src/renderer/App.tsx src/renderer/index.tsx index.html
git commit -m "feat: add main App component and HTML template"
```

---

## Task 15: Example Config

**Files:**
- Create: `configs/scraper-config.json`

**Step 1: Create example configuration**

Create `configs/scraper-config.json`:

```json
{
  "profiles": {
    "example-site": {
      "name": "Example Site",
      "categoryUrl": "https://example.com/products",
      "preActions": [
        {
          "type": "clickElement",
          "selector": "#cookie-accept",
          "optional": true
        },
        {
          "type": "sleep",
          "duration": 1000
        }
      ],
      "pagination": {
        "type": "button",
        "selector": ".next-page",
        "maxPages": 5
      },
      "productLinkSelector": ".product-card a",
      "productPageActions": [
        {
          "type": "clickElement",
          "selector": ".show-specs",
          "optional": true
        },
        {
          "type": "sleep",
          "duration": 500
        }
      ],
      "fieldSelectors": {
        "Brand": ".product-brand",
        "Model": ".product-model",
        "Light Engine": ".spec-light-engine",
        "CCT Start": ".spec-cct-start",
        "CCT End": ".spec-cct-end",
        "CRI (Average)": ".spec-cri"
      },
      "concurrency": 3,
      "delayRange": [2000, 4000],
      "retries": 3,
      "checkpointInterval": 10
    }
  }
}
```

**Step 2: Commit**

```bash
git add configs/scraper-config.json
git commit -m "feat: add example scraper configuration"
```

---

## Task 16: README Documentation

**Files:**
- Create: `README.md`

**Step 1: Create README**

Create `README.md`:

```markdown
# Configurable Web Scraper

Desktop application for scraping product specifications from e-commerce websites with anti-detection browser automation.

## Features

- 🚀 Concurrent scraping with configurable workers
- 🎯 CSS selector-based field extraction
- 🔄 Resumable scraping with checkpoints
- 📊 Real-time progress dashboard
- 💾 Export to CSV and JSON
- 🛡️ Anti-bot detection using patchright
- ⚙️ Profile-based configuration

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
npm run package
```

## Configuration

Edit `configs/scraper-config.json` to add site profiles:

```json
{
  "profiles": {
    "your-site": {
      "categoryUrl": "https://example.com/category",
      "productLinkSelector": ".product a",
      "fieldSelectors": {
        "Field Name": ".css-selector"
      }
    }
  }
}
```

## Usage

1. Start the application
2. Select a profile from the dropdown
3. Click "Start" to begin scraping
4. Monitor progress in real-time
5. Find results in `output/data.csv` and `output/data.json`

## Project Structure

```
src/
  main/           # Electron main process (Node.js)
  renderer/       # React UI
  shared/         # Shared types
configs/          # Scraper profiles
output/           # Generated data
```

## License

MIT
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with installation and usage instructions"
```

---

## Task 17: Final Integration Test

**Step 1: Build TypeScript files**

```bash
npm run build:main
```

Expected: TypeScript compiles without errors

**Step 2: Start development mode**

```bash
npm run dev
```

Expected: Vite starts on port 5173, Electron window opens

**Step 3: Test basic UI**

- Verify Dashboard renders
- Verify profile input is editable
- Verify Start button is clickable

**Step 4: Stop development**

Press Ctrl+C to stop

**Step 5: Commit final changes**

```bash
git add .
git commit -m "chore: verify build and development setup works"
```

---

## Next Steps (Out of Scope)

Future enhancements to consider:
- ConfigEditor component for visual selector testing
- LogViewer component for real-time logs
- ResultsPreview component with data table
- Integration tests with mock HTML pages
- Cross-platform builds testing
- Production packaging optimization

---

## Summary

This plan creates a fully functional configurable web scraper with:
- ✅ TypeScript + Electron architecture
- ✅ patchright for anti-detection
- ✅ Concurrent multi-context scraping
- ✅ Checkpoint/resume functionality
- ✅ CSV and JSON export
- ✅ React dashboard with real-time updates
- ✅ Profile-based configuration system
- ✅ Comprehensive testing setup

The application is ready for customization with site-specific selectors and can be packaged for distribution.
