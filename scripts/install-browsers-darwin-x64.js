#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('[Build] Installing Intel x64 browsers...');

// Set browser installation path
const browsersPath = path.join(__dirname, '..', 'playwright-browsers-x64');
const targetPath = path.join(__dirname, '..', 'browsers');

// Ensure directory exists
if (!fs.existsSync(browsersPath)) {
  fs.mkdirSync(browsersPath, { recursive: true });
}

try {
  // Install Intel browsers using Rosetta on ARM Macs
  // On Intel Macs, arch -x86_64 is a no-op
  execSync('arch -x86_64 npx patchright install chromium', {
    env: {
      ...process.env,
      PLAYWRIGHT_BROWSERS_PATH: browsersPath,
    },
    stdio: 'inherit',
  });

  console.log('[Build] Intel browsers installed successfully');
  console.log(`[Build] Location: ${browsersPath}`);

  // Copy to browsers directory for electron-builder
  console.log('[Build] Copying browsers to target directory...');
  if (fs.existsSync(targetPath)) {
    execSync(`rm -rf "${targetPath}"`, { stdio: 'inherit' });
  }
  execSync(`cp -R "${browsersPath}" "${targetPath}"`, { stdio: 'inherit' });
  console.log(`[Build] Browsers copied to: ${targetPath}`);
} catch (error) {
  console.error('[Build] Failed to install Intel browsers:', error.message);
  process.exit(1);
}
