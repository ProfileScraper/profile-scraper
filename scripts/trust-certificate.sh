#!/bin/bash

echo "================================================"
echo "ProfileScraper - Trust Code Signing Certificate"
echo "================================================"
echo ""
echo "This script will add ProfileScraper's code signing certificate"
echo "to your system's trusted certificates."
echo ""
echo "Benefits:"
echo "  • Future updates won't require 'Open Anyway' workaround"
echo "  • App updates can install automatically"
echo "  • One-time setup"
echo ""
echo "Note: You'll be prompted for your Mac password."
echo ""

read -p "Continue? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

APP_PATH="/Applications/ProfileScraper.app"

# Check if app exists
if [ ! -d "$APP_PATH" ]; then
    echo "❌ Error: ProfileScraper.app not found in /Applications/"
    echo ""
    echo "Please install ProfileScraper first."
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

echo ""
echo "Extracting certificate from ProfileScraper.app..."

# Extract the certificate
TEMP_CERT="/tmp/profilescraper-cert.cer"
codesign -d --extract-certificates "$APP_PATH" 2>/dev/null

# The certificate is extracted as codesign0
if [ -f "codesign0" ]; then
    mv codesign0 "$TEMP_CERT"
else
    echo "❌ Error: Could not extract certificate from app"
    echo ""
    echo "The app may not be properly signed."
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

echo "Adding certificate to system keychain..."

# Add certificate to system keychain as trusted
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain "$TEMP_CERT"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Success! Certificate is now trusted."
    echo ""
    echo "ProfileScraper and its updates will no longer trigger"
    echo "Gatekeeper warnings on this Mac."
    echo ""

    # Clean up
    rm -f "$TEMP_CERT"
else
    echo ""
    echo "❌ Error: Failed to add certificate to keychain."
    echo ""
    echo "You may need to run this script with administrator privileges."
    echo ""

    # Clean up
    rm -f "$TEMP_CERT"
fi

read -p "Press Enter to exit..."
