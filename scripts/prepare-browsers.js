#!/usr/bin/env node

/**
 * Downloads and prepares Chromium browsers for the target architecture
 * Usage: node scripts/prepare-browsers.js [x64|arm64]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get target architecture from command line or detect from system
const targetArch = process.argv[2] || process.arch;
const validArchs = ['x64', 'arm64'];

if (!validArchs.includes(targetArch)) {
  console.error(`Invalid architecture: ${targetArch}. Must be one of: ${validArchs.join(', ')}`);
  process.exit(1);
}

console.log('========================================');
console.log(`Preparing browsers for ${targetArch}`);
console.log('========================================');

const projectRoot = path.join(__dirname, '..');
const browsersDir = path.join(projectRoot, 'playwright-browsers');
const archBrowsersDir = path.join(projectRoot, `playwright-browsers-${targetArch}`);
const cacheDir = path.join(require('os').homedir(), 'Library', 'Caches', 'ms-playwright');

// Step 1: Check if we already have browsers for this architecture
if (fs.existsSync(archBrowsersDir)) {
  console.log(`✓ Found existing browsers for ${targetArch} at ${archBrowsersDir}`);

  // Copy to playwright-browsers directory
  console.log(`Copying to ${browsersDir}...`);
  if (fs.existsSync(browsersDir)) {
    fs.rmSync(browsersDir, { recursive: true, force: true });
  }
  fs.cpSync(archBrowsersDir, browsersDir, { recursive: true });
  console.log('✓ Browsers ready for packaging');
  process.exit(0);
}

// Step 2: Install browsers using patchright
console.log(`Installing browsers for ${targetArch}...`);
try {
  // Set architecture-specific environment variable if needed
  const env = { ...process.env };

  execSync('npx patchright install chromium', {
    stdio: 'inherit',
    env,
    cwd: projectRoot
  });

  console.log('✓ Browsers installed');
} catch (error) {
  console.error('Failed to install browsers:', error.message);
  process.exit(1);
}

// Step 3: Copy from cache to architecture-specific directory
console.log('Copying browsers from cache...');
const chromiumHeadlessShell = 'chromium_headless_shell-1194';
const sourcePath = path.join(cacheDir, chromiumHeadlessShell);

if (!fs.existsSync(sourcePath)) {
  console.error(`Browser not found in cache: ${sourcePath}`);
  console.error('Expected structure: ~/Library/Caches/ms-playwright/chromium_headless_shell-1194');
  process.exit(1);
}

// Create architecture-specific directory
if (!fs.existsSync(archBrowsersDir)) {
  fs.mkdirSync(archBrowsersDir, { recursive: true });
}

const destPath = path.join(archBrowsersDir, chromiumHeadlessShell);
fs.cpSync(sourcePath, destPath, { recursive: true });
console.log(`✓ Copied to ${archBrowsersDir}`);

// Step 4: Copy to main browsers directory for immediate use
if (fs.existsSync(browsersDir)) {
  fs.rmSync(browsersDir, { recursive: true, force: true });
}
fs.cpSync(archBrowsersDir, browsersDir, { recursive: true });
console.log(`✓ Copied to ${browsersDir}`);

console.log('========================================');
console.log(`✓ Browsers prepared for ${targetArch}`);
console.log('========================================');
