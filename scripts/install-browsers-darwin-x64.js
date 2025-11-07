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
