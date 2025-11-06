# Integration Test Checklist

This document provides a comprehensive manual testing checklist for the Profile Management UI application. Run through these tests to verify all features work correctly after changes.

## Pre-Test Setup

- [ ] Application builds successfully (`npm run build`)
- [ ] All unit tests pass (`npm test`)
- [ ] Development environment is running (`npm run dev`)
- [ ] Clear any previous test data or use a fresh database

---

## 1. Database Initialization

### First Launch
- [ ] Launch the application for the first time
- [ ] Verify the database file is created at the expected location
- [ ] Check that all required tables are created:
  - profiles
  - jobs
  - products
  - product_attributes
  - checkpoints
- [ ] Verify initial schema version is set correctly

### Database Migrations
- [ ] Test migration from older schema versions (if applicable)
- [ ] Verify data integrity after migration
- [ ] Check that all existing profiles/jobs are preserved
- [ ] Confirm checkpoint data is migrated correctly

---

## 2. Profile CRUD Operations

### Create Profile
- [ ] Navigate to the profile list
- [ ] Click "Add New Profile" or equivalent button
- [ ] Verify the profile builder wizard opens

### Read/List Profiles
- [ ] View the profile list
- [ ] Verify all created profiles are displayed
- [ ] Check that profile cards show:
  - Profile name
  - Base URL
  - Creation date
  - Status indicators
- [ ] Verify empty state message when no profiles exist

### Update Profile
- [ ] Select an existing profile
- [ ] Click "Edit" or equivalent action
- [ ] Modify profile settings:
  - Change profile name
  - Update base URL
  - Modify field mappings
  - Update selectors
- [ ] Save changes
- [ ] Verify changes are persisted
- [ ] Reload application and confirm updates remain

### Delete Profile
- [ ] Select a profile to delete
- [ ] Click "Delete" action
- [ ] Verify confirmation dialog appears
- [ ] Confirm deletion
- [ ] Verify profile is removed from list
- [ ] Check that associated jobs are handled appropriately
- [ ] Ensure database integrity (no orphaned records)

---

## 3. Profile Builder Wizard (5 Steps)

### Step 1: Basic Information
- [ ] Enter profile name
- [ ] Enter base URL
- [ ] Verify validation:
  - Name is required
  - URL format is validated
  - Duplicate names are prevented
- [ ] Click "Next" to proceed
- [ ] Verify "Back" button is disabled on first step

### Step 2: Navigation Configuration
- [ ] Configure category list selector
- [ ] Set category link selector
- [ ] Configure pagination:
  - Next page button selector
  - OR page number selector pattern
  - Maximum pages setting
- [ ] Test selector preview (if available)
- [ ] Navigate between "Back" and "Next"
- [ ] Verify form state is preserved when navigating

### Step 3: Product List Configuration
- [ ] Set product list container selector
- [ ] Configure product link selector
- [ ] Set up product listing patterns
- [ ] Test selector validation
- [ ] Verify "Test Selector" functionality (if available)
- [ ] Navigate between steps and verify data persistence

### Step 4: Field Mapping
- [ ] Add field mappings:
  - Add at least 3-5 fields
  - Test different field types (text, number, price, etc.)
  - Configure selectors for each field
  - Set required vs optional fields
- [ ] Edit existing field mappings
- [ ] Delete field mappings
- [ ] Reorder fields (if drag-and-drop supported)
- [ ] Test validation:
  - Field names are unique
  - Selectors are not empty
  - At least one field is configured
- [ ] Verify field preview functionality

### Step 5: Advanced Actions
- [ ] Configure pre-scrape actions:
  - Click actions (buttons, tabs, etc.)
  - Scroll actions
  - Wait actions
  - Input/form fill actions
- [ ] Set action order and timing
- [ ] Configure action conditions (if available)
- [ ] Mark actions as required vs optional
- [ ] Test action validation
- [ ] Review summary of all configuration
- [ ] Click "Create Profile" or "Save Profile"
- [ ] Verify success message
- [ ] Confirm profile appears in list

### Wizard Navigation
- [ ] Test "Back" button on all steps (except first)
- [ ] Test "Next" button validation on each step
- [ ] Verify "Cancel" button shows confirmation dialog
- [ ] Test keyboard navigation (Tab, Enter, Escape)
- [ ] Verify progress indicator updates correctly

---

## 4. Job Operations

### Create Job
- [ ] Select a profile
- [ ] Click "Start New Job" or equivalent
- [ ] Configure job settings:
  - Select categories to scrape (if applicable)
  - Set concurrency/threading options
  - Configure output settings
- [ ] Start the job
- [ ] Verify job appears in job list with "Running" status

### Monitor Job Progress
- [ ] View active job in job list
- [ ] Check real-time progress updates:
  - Products scraped count
  - Current page/category
  - Success/failure counts
  - Estimated time remaining
- [ ] Verify progress bar updates
- [ ] Check logs/console for detailed information

### Pause/Resume Job
- [ ] Pause a running job
- [ ] Verify status changes to "Paused"
- [ ] Check that scraping stops
- [ ] Resume the job
- [ ] Verify scraping continues from checkpoint
- [ ] Confirm no data loss or duplication

### Stop Job
- [ ] Stop a running job
- [ ] Verify confirmation dialog
- [ ] Confirm job is stopped
- [ ] Check that partial results are saved
- [ ] Verify job status changes to "Stopped"

### View Job Results
- [ ] Navigate to completed job
- [ ] View scraped products list
- [ ] Check product details:
  - All configured fields are present
  - Data is correctly formatted
  - Images/media are loaded (if applicable)
- [ ] Verify product count matches expected results
- [ ] Test pagination/filtering in results view

### Export Job Results
- [ ] Select a completed job
- [ ] Choose export format (CSV, JSON, Excel, etc.)
- [ ] Export results
- [ ] Verify downloaded file:
  - File format is correct
  - All products are included
  - Field names/headers are correct
  - Data integrity is maintained
- [ ] Test different export options/formats

### Delete Job
- [ ] Select a job to delete
- [ ] Click "Delete" action
- [ ] Verify confirmation dialog
- [ ] Confirm deletion
- [ ] Check that job and results are removed
- [ ] Verify checkpoint data is cleaned up

---

## 5. Data Migration

### Checkpoint System
- [ ] Start a large scraping job
- [ ] Let it run for a few products
- [ ] Force quit the application (simulate crash)
- [ ] Restart the application
- [ ] Resume the job
- [ ] Verify:
  - Job resumes from last checkpoint
  - No duplicate products are scraped
  - Progress is accurately restored
  - All previously scraped data is intact

### Profile Migration
- [ ] Create profiles with different configurations
- [ ] Update the application (simulate version upgrade)
- [ ] Verify all profiles load correctly
- [ ] Check that profile configurations are intact
- [ ] Test running jobs with migrated profiles

### Data Export/Import
- [ ] Export profile configuration
- [ ] Delete the profile
- [ ] Import the profile configuration
- [ ] Verify all settings are restored correctly
- [ ] Test the imported profile with a new job

---

## 6. UI Navigation

### Main Navigation
- [ ] Navigate between main sections:
  - Profile List
  - Job List
  - Settings
  - About/Help
- [ ] Verify navigation state is preserved
- [ ] Test browser back/forward buttons (if applicable)
- [ ] Check that active section is highlighted

### Profile List View
- [ ] Test search/filter functionality
- [ ] Sort profiles by:
  - Name
  - Date created
  - Last used
- [ ] Test grid vs list view toggle (if available)
- [ ] Verify empty state messaging
- [ ] Test profile selection/deselection

### Job List View
- [ ] Filter jobs by status:
  - Running
  - Paused
  - Completed
  - Failed
  - Stopped
- [ ] Sort jobs by date
- [ ] Search for specific jobs
- [ ] View job details
- [ ] Test job actions menu

### Settings View
- [ ] Access application settings
- [ ] Modify settings:
  - Default concurrency
  - Storage location
  - Export preferences
  - UI theme (if applicable)
- [ ] Save settings
- [ ] Verify settings persist after restart

### Keyboard Shortcuts
- [ ] Test common keyboard shortcuts:
  - Ctrl/Cmd+N: New profile
  - Ctrl/Cmd+S: Save
  - Escape: Cancel/Close
  - Tab: Navigate form fields
  - Enter: Submit/Confirm
- [ ] Verify keyboard accessibility throughout app

### Responsive Design
- [ ] Test window resizing
- [ ] Verify layouts adapt appropriately
- [ ] Check that no content is cut off
- [ ] Test minimum window size constraints

---

## 7. Error Handling

### Network Errors
- [ ] Disconnect network during a job
- [ ] Verify graceful error handling
- [ ] Check that retry logic works
- [ ] Confirm appropriate error messages

### Invalid Selectors
- [ ] Create a profile with invalid selectors
- [ ] Run a job with the profile
- [ ] Verify error messages are clear
- [ ] Check that job fails gracefully
- [ ] Test selector validation during profile creation

### Database Errors
- [ ] Simulate database lock scenario
- [ ] Test recovery from database errors
- [ ] Verify data integrity after errors
- [ ] Check error logging

### Invalid URLs
- [ ] Create profile with invalid base URL
- [ ] Test scraping non-existent pages
- [ ] Verify 404 handling
- [ ] Check redirect handling

---

## 8. Performance Testing

### Large Profile Sets
- [ ] Create 50+ profiles
- [ ] Verify list performance
- [ ] Test search/filter speed
- [ ] Check memory usage

### Large Job Results
- [ ] Run a job that scrapes 1000+ products
- [ ] Monitor application performance
- [ ] Test results viewing performance
- [ ] Verify export performance
- [ ] Check database query performance

### Concurrent Operations
- [ ] Run multiple jobs simultaneously
- [ ] Verify each job progresses correctly
- [ ] Check for resource conflicts
- [ ] Monitor system resource usage

---

## 9. Data Integrity

### Checkpoint Verification
- [ ] Verify checkpoint data after each scraping session
- [ ] Check that progress is accurately recorded
- [ ] Confirm URLs are tracked correctly
- [ ] Validate scraped vs pending counts

### Product Data Validation
- [ ] Verify all configured fields are captured
- [ ] Check data type consistency
- [ ] Validate required vs optional field handling
- [ ] Test special character handling
- [ ] Verify URL encoding/decoding

### Database Consistency
- [ ] Check for orphaned records
- [ ] Verify foreign key relationships
- [ ] Test cascade delete operations
- [ ] Validate data type constraints

---

## 10. Cross-Platform Testing

### Windows
- [ ] Run application on Windows
- [ ] Verify all features work
- [ ] Test file path handling
- [ ] Check UI rendering

### macOS
- [ ] Run application on macOS
- [ ] Verify all features work
- [ ] Test native menu integration
- [ ] Check keyboard shortcuts (Cmd vs Ctrl)

### Linux
- [ ] Run application on Linux
- [ ] Verify all features work
- [ ] Test package installation
- [ ] Check permissions handling

---

## Test Results

### Summary
- **Date Tested:** _______________
- **Tester:** _______________
- **Version:** _______________
- **Total Tests:** _______________
- **Passed:** _______________
- **Failed:** _______________
- **Blocked:** _______________

### Issues Found
List any issues discovered during testing:

1.
2.
3.

### Notes
Additional observations or comments:

---

## Sign-off

- [ ] All critical tests passed
- [ ] All blocking issues resolved
- [ ] Application is ready for release

**Tester Signature:** _______________ **Date:** _______________
