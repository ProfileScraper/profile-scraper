# Manual Testing Checklist - Profile Sharing & Marketplace

## Overview

This document outlines the manual testing required for the Profile Sharing & Marketplace features (Task 6.1 from the implementation plan). These tests require running the application.

## 1. Export/Import Testing

### Export Profile
- [ ] Export a user-created profile
- [ ] Verify JSON file downloads to chosen location
- [ ] Open JSON file and verify all fields are present (name, categoryUrl, selectors, metadata)
- [ ] Verify export warning dialog appears before download
- [ ] Verify internal IDs (id, created_at, updated_at) are NOT in exported JSON

### Import from File
- [ ] Click "Import Profile" button in Profile Library
- [ ] Select "Import File" tab
- [ ] Choose a valid .json profile file
- [ ] Verify profile appears in Profile Library after import
- [ ] Verify all fields are preserved correctly
- [ ] Cancel import and verify nothing is imported

### Import from URL
- [ ] Click "Import Profile" button in Profile Library
- [ ] Select "Import from URL" tab
- [ ] Paste a GitHub raw URL (e.g., `https://raw.githubusercontent.com/user/repo/main/profile.json`)
- [ ] Verify profile imports successfully
- [ ] Verify `sourceUrl` field is set on imported profile
- [ ] Try an HTTP URL (not HTTPS) and verify error message about HTTPS requirement
- [ ] Try an invalid URL and verify user-friendly error message
- [ ] Try a 404 URL and verify "Profile not found" error message

### Import Validation
- [ ] Import JSON with missing required field (e.g., no `name`) and verify validation error
- [ ] Import JSON with invalid field type (e.g., `preActions` as string instead of array) and verify error
- [ ] Import JSON with malformed JSON syntax and verify "Invalid JSON" error

## 2. Marketplace Testing

### Marketplace Sync
- [ ] Navigate to Marketplace tab
- [ ] Click "Refresh" button to sync marketplace
- [ ] Verify public profiles appear (or empty state if CDN not configured)
- [ ] Check DevTools console for sync result message
- [ ] Verify sync button shows "Syncing..." during operation
- [ ] Test network failure: Disconnect internet and verify graceful error handling

### Marketplace Search & Filtering
- [ ] Enter text in search box and verify profiles filter by name
- [ ] Search for domain name and verify filtering works
- [ ] Search for author name and verify filtering works
- [ ] Click tag filters and verify only matching profiles show
- [ ] Select multiple tags and verify profiles match all selected tags
- [ ] Clear all filters and verify all profiles return

### Clone Public Profile
- [ ] Click "Clone" on a public profile
- [ ] Verify new profile is created with "(Copy)" suffix
- [ ] Verify cloned profile is NOT read-only
- [ ] Verify cloned profile has `sourceProfileId` pointing to original
- [ ] Edit cloned profile and verify save works

### Read-only Enforcement
- [ ] Try to edit a public profile directly
- [ ] Verify "Edit" button is hidden
- [ ] Verify read-only banner appears with lock icon
- [ ] Verify "Clone to Edit" button is shown instead
- [ ] Open ProfileBuilder for read-only profile and verify form is disabled
- [ ] Verify save button is hidden for read-only profiles

## 3. UI Testing

### View Toggle
- [ ] Click "Grid View" and verify profiles display in grid
- [ ] Click "Grouped by Domain" and verify profiles group by domain
- [ ] Reload app and verify last view preference is remembered
- [ ] Switch views multiple times and verify no errors

### Domain Grouping
- [ ] In grouped view, verify domains are sorted alphabetically
- [ ] Click domain header to collapse group
- [ ] Verify profiles are hidden when collapsed
- [ ] Click again to expand and verify profiles reappear
- [ ] Reload app and verify collapsed state is remembered
- [ ] Create profiles for multiple domains and verify all groups appear

### Read-only Indicators
- [ ] Verify public profiles have blue lock icon in card header
- [ ] Verify public profiles have blue background/border
- [ ] Verify "Public" badge appears on read-only profiles
- [ ] Verify cloned profiles show "Cloned from: [author]" text
- [ ] Verify user profiles show normal Edit/Export/Delete buttons

### Import/Export Dialogs
- [ ] Open Import dialog and verify tabs switch correctly
- [ ] Import a profile and verify success message appears
- [ ] Import an invalid profile and verify error messages display
- [ ] Verify warnings (if any) display in yellow section
- [ ] Close dialog with X or Cancel button
- [ ] Open Export dialog and verify warning text is clear
- [ ] Verify dialog closes after successful export

## 4. Repository Testing

### Database Operations
- [ ] Create a new profile with metadata (author, description, tags)
- [ ] Verify metadata saves correctly (check with SQLite viewer)
- [ ] Update profile metadata and verify changes persist
- [ ] Attempt to update read-only profile via ProfileBuilder
- [ ] Verify error prevents update of read-only profile
- [ ] Clone a profile and verify source_profile_id is set correctly
- [ ] Delete a profile and verify cascade (check products table)

### Migration
- [ ] Close app completely
- [ ] Start app and verify database migration runs automatically
- [ ] Check that new columns exist: is_public, is_readonly, source_profile_id, source_url, author, description, tags, version, last_synced
- [ ] Verify existing profiles still load correctly
- [ ] Verify no data loss from migration

## 5. Integration Testing

### End-to-End Export/Import Flow
- [ ] Create a profile with all fields populated
- [ ] Add pre-actions, product page actions, pagination config
- [ ] Export the profile
- [ ] Delete original profile
- [ ] Import from exported file
- [ ] Verify all fields match original exactly
- [ ] Run a scrape with imported profile
- [ ] Verify scraping works identically to original

### End-to-End Marketplace Flow
- [ ] Sync marketplace (or import URL to simulate public profile)
- [ ] Browse marketplace and find a profile
- [ ] Filter by tags to find specific profile
- [ ] Clone the profile
- [ ] Modify cloned profile (change selectors, add fields)
- [ ] Save changes
- [ ] Run scrape with modified clone
- [ ] Verify scraping works with modifications
- [ ] Verify original public profile remains unchanged

## 6. Error Handling

### Network Errors
- [ ] Import from URL with no internet connection
- [ ] Verify user-friendly error message
- [ ] Sync marketplace with no internet
- [ ] Verify graceful fallback with error message

### File System Errors
- [ ] Export profile to read-only directory (if possible)
- [ ] Verify error handling
- [ ] Import from file with insufficient permissions
- [ ] Verify error message

### Validation Errors
- [ ] Import profile with missing categoryUrl
- [ ] Import profile with invalid concurrency (e.g., -1)
- [ ] Import profile with preActions as non-array
- [ ] Verify all validation errors are clear and actionable

## 7. Performance Testing

### Large Profile Sets
- [ ] Import 20+ profiles
- [ ] Test Grid view performance
- [ ] Test Grouped view performance with many domains
- [ ] Verify search/filter responsiveness
- [ ] Check memory usage in Activity Monitor

### Large Profile JSON
- [ ] Export profile with 50+ field selectors
- [ ] Import the large profile
- [ ] Verify no performance issues
- [ ] Verify all fields preserved

## Testing Complete

After completing all tests above:
- [ ] Document any bugs found in GitHub Issues
- [ ] Fix critical bugs before merging
- [ ] Note any performance concerns
- [ ] Verify all tests pass before considering feature complete
