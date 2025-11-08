# Bundle Browsers at Build Time Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bundle patchright browsers during build process instead of downloading at runtime, creating separate Intel and ARM DMGs.

**Architecture:** Install architecture-specific browsers during `npm run package:mac:intel` and `npm run package:mac:arm`, bundle them in the DMG, and configure patchright to use bundled browsers at runtime.

**Tech Stack:** electron-builder, patchright, Node.js build scripts

---

## Task 1: Remove Runtime Download Code

**Files:**
- Delete: `src/main/services/BrowserDownloadService.ts`
- Delete: `src/main/ipc/browserHandlers.ts`
- Modify: `src/main/main.ts` (remove browser download service setup)
- Delete: `src/renderer/components/BrowserDownloadDialog.tsx`
- Modify: `src/renderer/App.tsx` (remove browser download dialog)
- Modify: `src/main/ipc/handlers.ts` (remove browser check before scraping)
- Modify: `src/main/preload.ts` (remove browser download IPC)
- Modify: `src/renderer/types/electron.d.ts` (remove browser download types)
- Modify: `src/shared/ipc-channels.ts` (remove browser download channels)

**Step 1: Delete BrowserDownloadService**

```bash
rm src/main/services/BrowserDownloadService.ts
```

**Step 2: Delete browserHandlers**

```bash
rm src/main/ipc/browserHandlers.ts
```

**Step 3: Delete BrowserDownloadDialog**

```bash
rm src/renderer/components/BrowserDownloadDialog.tsx
```

**Step 4: Remove browser setup from main.ts**

Find and remove these lines in `src/main/main.ts`:

```typescript
// Remove:
import { BrowserDownloadService } from './services/BrowserDownloadService';

// Remove:
const browserService = new BrowserDownloadService();
logInfo(`[Main] Browser info: ${JSON.stringify(browserService.getBrowserInfo())}`);
```

**Step 5: Remove browser handler setup from main.ts**

Find and remove in `src/main/main.ts`:

```typescript
// Remove:
import { setupBrowserHandlers } from './ipc/browserHandlers';

// Remove:
setupBrowserHandlers();
```

**Step 6: Remove browser dialog from App.tsx**

In `src/renderer/App.tsx`, remove:

```typescript
// Remove import:
import { BrowserDownloadDialog } from './components/BrowserDownloadDialog';

// Remove state:
const [showBrowserDialog, setShowBrowserDialog] = useState(false);

// Remove useEffect that checks for browsers

// Remove JSX:
<BrowserDownloadDialog
  isOpen={showBrowserDialog}
  onClose={() => setShowBrowserDialog(false)}
  onComplete={() => setShowBrowserDialog(false)}
/>
```

**Step 7: Remove browser check from scrape handler**

In `src/main/ipc/handlers.ts`, find SCRAPE_START handler and remove browser check:

```typescript
// Remove these lines:
const { BrowserDownloadService } = require('../services/BrowserDownloadService');
const browserService = new BrowserDownloadService();

if (!browserService.areBrowsersInstalled()) {
  throw new Error('Browsers not installed. Please download browsers first.');
}
```

**Step 8: Remove browser IPC from preload.ts**

In `src/main/preload.ts`, remove:

```typescript
// Remove:
checkBrowsersInstalled: () => ipcRenderer.invoke(IPC_CHANNELS.BROWSER_CHECK_INSTALLED),
downloadBrowsers: () => ipcRenderer.invoke(IPC_CHANNELS.BROWSER_DOWNLOAD),
onBrowserDownloadProgress: (callback: (message: string) => void) => {
  const cleanup = ipcRenderer.on(IPC_CHANNELS.BROWSER_DOWNLOAD_PROGRESS, (_event, message) => {
    callback(message);
  });
  return cleanup;
},
```

**Step 9: Remove browser types from electron.d.ts**

In `src/renderer/types/electron.d.ts`, remove:

```typescript
// Remove:
checkBrowsersInstalled: () => Promise<{ installed: boolean; info: any }>;
downloadBrowsers: () => Promise<{ success: boolean; error?: string }>;
onBrowserDownloadProgress: (callback: (message: string) => void) => () => void;
```

**Step 10: Remove browser channels from ipc-channels.ts**

In `src/shared/ipc-channels.ts`, remove:

```typescript
// Remove:
BROWSER_CHECK_INSTALLED: 'browser:check-installed',
BROWSER_DOWNLOAD: 'browser:download',
BROWSER_DOWNLOAD_PROGRESS: 'browser:download-progress',
```

**Step 11: Commit cleanup**

```bash
git add -A
git commit -m "feat: remove runtime browser download code"
```

---

## Task 2: Create Build-Time Browser Installation Scripts

**Files:**
- Create: `scripts/install-browsers-darwin-x64.js`
- Create: `scripts/install-browsers-darwin-arm64.js`
- Modify: `package.json` (add prebuild scripts)
- Modify: `.gitignore` (ignore browsers directory)

**Step 1: Create Intel browser install script**

Create `scripts/install-browsers-darwin-x64.js`:

```javascript
#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('[Build] Installing Intel x64 browsers...');

// Set browser installation path
const browsersPath = path.join(__dirname, '..', 'playwright-browsers-x64');

// Ensure directory exists
if (!fs.existsSync(browsersPath)) {
  fs.mkdirSync(browsersPath, { recursive: true });
}

try {
  // Install Intel browsers
  execSync('npx patchright install chromium --platform=darwin-x64', {
    env: {
      ...process.env,
      PLAYWRIGHT_BROWSERS_PATH: browsersPath,
    },
    stdio: 'inherit',
  });

  console.log('[Build] Intel browsers installed successfully');
  console.log(`[Build] Location: ${browsersPath}`);
} catch (error) {
  console.error('[Build] Failed to install Intel browsers:', error.message);
  process.exit(1);
}
```

**Step 2: Create ARM browser install script**

Create `scripts/install-browsers-darwin-arm64.js`:

```javascript
#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('[Build] Installing ARM64 browsers...');

// Set browser installation path
const browsersPath = path.join(__dirname, '..', 'playwright-browsers-arm64');

// Ensure directory exists
if (!fs.existsSync(browsersPath)) {
  fs.mkdirSync(browsersPath, { recursive: true });
}

try {
  // Install ARM browsers
  execSync('npx patchright install chromium --platform=darwin-arm64', {
    env: {
      ...process.env,
      PLAYWRIGHT_BROWSERS_PATH: browsersPath,
    },
    stdio: 'inherit',
  });

  console.log('[Build] ARM64 browsers installed successfully');
  console.log(`[Build] Location: ${browsersPath}`);
} catch (error) {
  console.error('[Build] Failed to install ARM64 browsers:', error.message);
  process.exit(1);
}
```

**Step 3: Make scripts executable**

```bash
chmod +x scripts/install-browsers-darwin-x64.js
chmod +x scripts/install-browsers-darwin-arm64.js
```

**Step 4: Update .gitignore**

Add to `.gitignore`:

```
playwright-browsers-x64/
playwright-browsers-arm64/
```

**Step 5: Update package.json scripts**

In `package.json`, update:

```json
{
  "scripts": {
    "package:mac:intel": "node scripts/install-browsers-darwin-x64.js && npm run build && electron-builder --mac --x64",
    "package:mac:arm": "node scripts/install-browsers-darwin-arm64.js && npm run build && electron-builder --mac --arm64"
  }
}
```

**Step 6: Commit build scripts**

```bash
git add scripts/ .gitignore package.json
git commit -m "feat: add build-time browser installation scripts"
```

---

## Task 3: Configure electron-builder to Bundle Browsers

**Files:**
- Modify: `electron-builder.yml`

**Step 1: Update electron-builder config**

Replace `electron-builder.yml` contents:

```yaml
appId: com.profilescraper.app
productName: ProfileScraper
directories:
  output: release
files:
  - dist/**/*
  - node_modules/**/*
  - package.json
  - from: playwright-browsers-${arch}
    to: browsers
    filter:
      - "**/*"
asarUnpack:
  - node_modules/patchright/**/*
  - browsers/**/*
mac:
  target:
    - target: dmg
      arch:
        - x64
        - arm64
  category: public.app-category.utilities
  icon: assets/icon.icns
  artifactName: ${productName}-${version}-${arch}.${ext}
win:
  target:
    - target: nsis
      arch:
        - x64
    - target: portable
      arch:
        - x64
  icon: assets/icon.ico
linux:
  target:
    - target: AppImage
      arch:
        - x64
    - target: deb
      arch:
        - x64
  category: Utility
```

Key changes:
- `from: playwright-browsers-${arch}` - Copy arch-specific browsers
- `to: browsers` - Place in root of app
- `asarUnpack: browsers/**/*` - Don't pack browsers in asar (they need to be executable)
- `artifactName: ${productName}-${version}-${arch}.${ext}` - Include arch in filename

**Step 2: Commit electron-builder config**

```bash
git add electron-builder.yml
git commit -m "feat: configure electron-builder to bundle browsers"
```

---

## Task 4: Configure Runtime Browser Path

**Files:**
- Modify: `src/main/main.ts`

**Step 1: Set PLAYWRIGHT_BROWSERS_PATH at startup**

In `src/main/main.ts`, replace the browser path setup section:

```typescript
// Find this section:
logInfo('[Main] Setting up browser path...');
process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(app.getPath('userData'), 'browsers');
logInfo(`[Main] PLAYWRIGHT_BROWSERS_PATH set to: ${process.env.PLAYWRIGHT_BROWSERS_PATH}`);

// Replace with:
logInfo('[Main] Setting up browser path...');

// In production, browsers are bundled in app.asar.unpacked/browsers
// In development, browsers are in node_modules (installed automatically)
if (app.isPackaged) {
  // Production: use bundled browsers
  const browsersPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'browsers');
  process.env.PLAYWRIGHT_BROWSERS_PATH = browsersPath;
  logInfo(`[Main] Using bundled browsers at: ${browsersPath}`);
} else {
  // Development: use default playwright cache
  logInfo('[Main] Development mode - using default playwright browser cache');
}
```

**Step 2: Verify browser path logic**

Test that:
- `app.isPackaged === false` in development → uses default cache
- `app.isPackaged === true` in production → uses bundled browsers

**Step 3: Commit runtime configuration**

```bash
git add src/main/main.ts
git commit -m "feat: configure runtime browser path for bundled browsers"
```

---

## Task 5: Test the Build Process

**Step 1: Clean previous builds**

```bash
rm -rf release/
rm -rf playwright-browsers-x64/
rm -rf playwright-browsers-arm64/
```

**Step 2: Test Intel build**

```bash
npm run package:mac:intel
```

Expected output:
- `[Build] Installing Intel x64 browsers...`
- `Downloading Chromium...`
- `[Build] Intel browsers installed successfully`
- `electron-builder` output
- DMG created: `release/ProfileScraper-1.5.2-x64.dmg`

**Step 3: Test ARM build**

```bash
npm run package:mac:arm
```

Expected output:
- `[Build] Installing ARM64 browsers...`
- `Downloading Chromium...`
- `[Build] ARM64 browsers installed successfully`
- `electron-builder` output
- DMG created: `release/ProfileScraper-1.5.2-arm64.dmg`

**Step 4: Verify DMG contents**

Mount the DMG and check:

```bash
hdiutil attach release/ProfileScraper-1.5.2-x64.dmg
ls -la "/Volumes/ProfileScraper 1.5.2/ProfileScraper.app/Contents/Resources/app.asar.unpacked/browsers/"
```

Expected: chromium directory with binaries

```bash
hdiutil detach "/Volumes/ProfileScraper 1.5.2"
```

**Step 5: Test installed app**

1. Install ProfileScraper from DMG
2. Launch app
3. Check logs show: `Using bundled browsers at: ...`
4. Try running a scraping job
5. Verify browser launches successfully

**Step 6: Commit if tests pass**

```bash
git add -A
git commit -m "test: verify build process bundles browsers correctly"
```

---

## Task 6: Update Documentation

**Files:**
- Modify: `README.md`

**Step 1: Update README build instructions**

In `README.md`, update build section:

```markdown
## Building for Distribution

### macOS

Build separate DMGs for Intel and ARM:

\`\`\`bash
# Intel (x64)
npm run package:mac:intel

# ARM (Apple Silicon)
npm run package:mac:arm
\`\`\`

Output: `release/ProfileScraper-<version>-<arch>.dmg`

**Note:** Browsers are bundled during build (~150MB per architecture). First build will download browsers.

### Windows

\`\`\`bash
npm run package:win
\`\`\`

### Linux

\`\`\`bash
npm run package:linux
\`\`\`
```

**Step 2: Update README development section**

Add note about browser caching:

```markdown
## Development

\`\`\`bash
npm run dev
\`\`\`

**Browser Binaries:** Development uses playwright's default browser cache (`~/Library/Caches/ms-playwright` on macOS). Browsers are auto-downloaded on first `require('patchright')`.
```

**Step 3: Commit documentation**

```bash
git add README.md
git commit -m "docs: update build instructions for bundled browsers"
```

---

## Verification Checklist

After completing all tasks:

- [ ] No runtime download code remains
- [ ] Build scripts exist for both architectures
- [ ] electron-builder config includes browsers
- [ ] Runtime correctly uses bundled browsers
- [ ] Intel DMG builds successfully (~300MB)
- [ ] ARM DMG builds successfully (~300MB)
- [ ] DMG filenames include architecture
- [ ] Installed app uses bundled browsers
- [ ] Scraping works in installed app
- [ ] Documentation updated

---

## Rollback Plan

If bundling fails:

1. `git revert` commits in reverse order
2. Restore BrowserDownloadService approach
3. Investigate build script errors
4. Consider alternative: universal binary with both architectures

---

## Notes

- Browser binaries are ~120-150MB per architecture
- Total DMG size: ~300MB (vs previous ~193MB unbundled)
- Build time increases by ~2-3 minutes for browser download
- Users get immediate functionality, no first-run download
- Separate DMGs eliminate EBADARCH errors completely
