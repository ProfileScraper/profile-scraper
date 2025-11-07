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
