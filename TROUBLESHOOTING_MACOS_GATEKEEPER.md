# Troubleshooting macOS Gatekeeper "Damaged App" Error

## Problem
v1.5.4 DMG built by GitHub Actions shows "ProfileScraper is damaged and can't be opened" error, even when using right-click → Open method.

## Verified Working
- Local builds (v1.5.2, v1.5.3) work fine
- GitHub Actions workflow properly skips signing (`identity: null`)
- Build logs show: `"skipped macOS code signing reason=identity explicitly is set to null"`

## Root Cause Analysis
macOS Sequoia (15.x) has stricter Gatekeeper policies. The combination of:
1. Unsigned app
2. Downloaded from internet (quarantine flag)
3. Built on different machine (GitHub Actions runner)

...may trigger additional security checks that local builds don't.

## Solutions to Try

### Option 1: Remove Quarantine Flag (Recommended First Step)
```bash
# Remove quarantine attributes from the app
xattr -cr /Applications/ProfileScraper.app

# Try opening
open /Applications/ProfileScraper.app
```

### Option 2: Temporarily Disable Gatekeeper (Use Carefully)
```bash
# Disable Gatekeeper (requires admin password)
sudo spctl --master-disable

# Open the app
open /Applications/ProfileScraper.app

# Re-enable Gatekeeper after opening (IMPORTANT!)
sudo spctl --master-enable
```

### Option 3: Add to Gatekeeper Exceptions
```bash
# Add the app to Gatekeeper exceptions
sudo spctl --add /Applications/ProfileScraper.app

# Try opening
open /Applications/ProfileScraper.app
```

### Option 4: Notarization (Proper Long-term Solution)
To properly distribute unsigned apps on macOS 15+, you need to:

1. **Get Apple Developer Account** ($99/year)
2. **Sign the app** with Developer ID certificate
3. **Notarize** the DMG with Apple

This is the only guaranteed way to avoid Gatekeeper warnings on modern macOS.

**Implementation:**
```yaml
# Add to electron-builder.yml
mac:
  identity: "Developer ID Application: Your Name (TEAM_ID)"
  notarize:
    teamId: YOUR_TEAM_ID
```

**Add to GitHub Actions:**
```yaml
- name: Import Code Signing Certificate
  env:
    CERTIFICATE_P12: ${{ secrets.MACOS_CERTIFICATE }}
    CERTIFICATE_PASSWORD: ${{ secrets.MACOS_CERTIFICATE_PWD }}
    KEYCHAIN_PASSWORD: ${{ secrets.KEYCHAIN_PASSWORD }}
  run: |
    # Create keychain
    security create-keychain -p "$KEYCHAIN_PASSWORD" build.keychain
    security default-keychain -s build.keychain
    security unlock-keychain -p "$KEYCHAIN_PASSWORD" build.keychain

    # Import certificate
    echo "$CERTIFICATE_P12" | base64 --decode > certificate.p12
    security import certificate.p12 -k build.keychain -P "$CERTIFICATE_PASSWORD" -T /usr/bin/codesign
    security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k "$KEYCHAIN_PASSWORD" build.keychain

- name: Build and Notarize
  env:
    APPLE_ID: ${{ secrets.APPLE_ID }}
    APPLE_ID_PASSWORD: ${{ secrets.APPLE_ID_PASSWORD }}
    APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
  run: npm run package:mac:arm
```

## Why This Happens with GitHub Actions But Not Local Builds

1. **Machine Trust**: Local builds inherit some trust from your development machine
2. **Quarantine Flags**: Safari/Arc browser may add stricter quarantine attributes than local file creation
3. **macOS Version**: macOS 15+ has enhanced security that treats unsigned apps more strictly
4. **DMG Creation**: DMG created on GitHub runner may have different metadata than local DMG

## References
- [Apple Developer Documentation - Notarizing macOS Software](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [electron-builder - Code Signing](https://www.electron.build/code-signing)
- [Gatekeeper Troubleshooting](https://support.apple.com/guide/security/gatekeeper-and-runtime-protection-sec5599b66df/web)
