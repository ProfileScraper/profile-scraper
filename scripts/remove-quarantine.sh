#!/bin/bash

# Post-install script to remove macOS quarantine attributes
# This allows ProfileScraper to run without code signing

echo "================================================"
echo "ProfileScraper - Remove Quarantine Attributes"
echo "================================================"
echo ""
echo "This script will remove macOS quarantine flags from ProfileScraper."
echo "This is necessary because the app is not code-signed with an Apple Developer certificate."
echo ""
echo "Location: /Applications/ProfileScraper.app"
echo ""

# Check if app exists
if [ ! -d "/Applications/ProfileScraper.app" ]; then
    echo "❌ Error: ProfileScraper.app not found in /Applications/"
    echo ""
    echo "Please drag ProfileScraper to your Applications folder first."
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

echo "Removing quarantine attributes..."
xattr -cr /Applications/ProfileScraper.app

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Success! ProfileScraper is now ready to use."
    echo ""
    echo "You can now open ProfileScraper from:"
    echo "  • Applications folder"
    echo "  • Spotlight (⌘+Space)"
    echo "  • Launchpad"
    echo ""
else
    echo ""
    echo "❌ Error: Failed to remove quarantine attributes."
    echo ""
    echo "You may need to run this command manually in Terminal:"
    echo "  xattr -cr /Applications/ProfileScraper.app"
    echo ""
fi

read -p "Press Enter to exit..."
