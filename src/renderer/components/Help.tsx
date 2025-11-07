import React, { useState, useEffect } from 'react';
import { BrowserDownloadDialog } from './BrowserDownloadDialog';

export function Help() {
  const [showBrowserDialog, setShowBrowserDialog] = useState(false);
  const [browserInfo, setBrowserInfo] = useState<any>(null);
  const [isCheckingBrowsers, setIsCheckingBrowsers] = useState(false);

  const checkBrowserStatus = async () => {
    setIsCheckingBrowsers(true);
    try {
      const result = await window.electronAPI.checkBrowsersInstalled();
      const info = await window.electronAPI.getBrowserInfo();
      setBrowserInfo({ ...result, ...info });
    } catch (error) {
      console.error('[Help] Failed to check browser status:', error);
    } finally {
      setIsCheckingBrowsers(false);
    }
  };

  useEffect(() => {
    checkBrowserStatus();
  }, []);

  const handleBrowserDownloadComplete = () => {
    setShowBrowserDialog(false);
    checkBrowserStatus(); // Refresh status
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="h-[82px] px-6 border-b border-gray-400 flex items-center gap-3 shrink-0">
        <img
          src={new URL('../assets/logo.png', import.meta.url).href}
          alt="ProfileScraper"
          className="w-10 h-10 rounded-lg"
        />
        <div>
          <h1 className="text-xl font-bold text-gray-800">Help</h1>
          <p className="text-xs text-gray-600">User Guide</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto w-full px-8 py-8">

        <div className="prose max-w-none">
          <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Getting Started</h2>
              <p className="text-gray-700 mb-4">
                ProfileScraper is a powerful desktop application for scraping product data from e-commerce
                websites with advanced anti-detection capabilities and profile-based configuration.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">1. Create a Profile</h2>
              <p className="text-gray-700 mb-3">
                Navigate to the <strong>Profiles</strong> tab and click <strong>Create New Profile</strong>:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li><strong>Profile Name</strong> - A descriptive name for your scraping target</li>
                <li><strong>Category URL</strong> - The listing page to start crawling from</li>
                <li><strong>Product Link Selector</strong> - CSS selector to find product links on the category page</li>
                <li>
                  <strong>Field Selectors</strong> - Map field names to CSS selectors for data extraction
                  <ul className="list-circle list-inside ml-6 mt-1">
                    <li>Supports text content extraction (default)</li>
                    <li>Supports attribute extraction (e.g., for images or links)</li>
                  </ul>
                </li>
                <li>
                  <strong>Pagination</strong> - Configure how to navigate through multiple pages
                  <ul className="list-circle list-inside ml-6 mt-1">
                    <li>Button-based: Click "Next" button</li>
                    <li>Infinite scroll: Auto-scroll to load more</li>
                    <li>URL-based: Increment page number in URL</li>
                  </ul>
                </li>
                <li><strong>Pre-Actions</strong> - Actions to perform on category page (click, scroll, wait)</li>
                <li><strong>Product Page Actions</strong> - Actions to perform on each product page</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Selector Guide</h2>
              <p className="text-gray-700 mb-3">
                ProfileScraper uses <strong>Playwright locators</strong> for selecting elements. You can use CSS selectors,
                text content, ARIA roles, and more.
              </p>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                <h3 className="font-bold text-blue-900 mb-2">Common Selector Examples</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2 text-sm">
                  <li><code className="bg-white px-2 py-1 rounded">.product-title</code> - CSS class selector</li>
                  <li><code className="bg-white px-2 py-1 rounded">#price</code> - ID selector</li>
                  <li><code className="bg-white px-2 py-1 rounded">img[alt="Product Image"]</code> - Attribute selector</li>
                  <li><code className="bg-white px-2 py-1 rounded">text=Add to Cart</code> - Text content (exact match)</li>
                  <li><code className="bg-white px-2 py-1 rounded">role=button[name="Buy Now"]</code> - ARIA role with name</li>
                  <li><code className="bg-white px-2 py-1 rounded">data-testid=product-card</code> - Test ID attribute</li>
                </ul>
              </div>

              <div className="bg-gray-50 p-4 rounded mb-3">
                <h3 className="font-bold text-gray-800 mb-2">Tips for Reliable Selectors</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700 ml-2 text-sm">
                  <li>Prefer semantic selectors (text, role, label) over brittle CSS classes</li>
                  <li>Use data attributes (data-testid, data-product-id) when available</li>
                  <li>Avoid deeply nested CSS selectors that break with layout changes</li>
                  <li>Test selectors in browser DevTools before adding to profile</li>
                  <li>Use <code className="bg-white px-1 rounded">{'>> text=foo'}</code> to combine selectors</li>
                </ul>
              </div>

              <p className="text-gray-700 text-sm">
                <strong>Learn more:</strong>{' '}
                <a
                  href="https://playwright.dev/docs/locators"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Playwright Locators Documentation
                </a>
                {' | '}
                <a
                  href="https://playwright.dev/docs/selectors"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Selector Best Practices
                </a>
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">2. Profile Explorer & Public Profiles</h2>
              <p className="text-gray-700 mb-3">
                Browse and use community-contributed profiles from the <strong>Profile Explorer</strong>:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
                <li><strong>Browse Public Profiles</strong> - Discover pre-configured profiles for popular e-commerce sites</li>
                <li><strong>Add to Library</strong> - Click the hamburger menu on any profile and select "Add to Library"</li>
                <li><strong>View in Scraping Profiles</strong> - Added profiles appear in your Scraping Profiles tab</li>
                <li><strong>Clone to Edit</strong> - Create an editable copy of any public profile</li>
                <li>
                  <strong>Share Your Profiles</strong> - Publish your own profiles to help the community
                  <ul className="list-circle list-inside ml-6 mt-1">
                    <li>Login with GitHub (required for publishing)</li>
                    <li>Click "Publish" on any of your profiles</li>
                    <li>Add description and tags to help others find it</li>
                    <li>Creates a pull request to the community repository</li>
                  </ul>
                </li>
              </ul>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
                <h3 className="font-bold text-blue-900 mb-2">About Public Profiles</h3>
                <p className="text-sm text-gray-700">
                  Public profiles are <strong>read-only</strong> and maintained by the community.
                  They're synced from GitHub and regularly updated. If you need to customize a public
                  profile, use <strong>Clone to Edit</strong> to create your own editable copy.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">3. Start a Scraping Job</h2>
              <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
                <li>Go to <strong>Profiles</strong> and click <strong>Run</strong> on your profile</li>
                <li className="ml-6">
                  The app will:
                  <ul className="list-disc list-inside ml-6 mt-1">
                    <li>Initialize the browser with anti-detection</li>
                    <li>Gather product URLs from the category page(s)</li>
                    <li>Scrape each product using concurrent workers</li>
                    <li>Save data and logs to the database</li>
                  </ul>
                </li>
                <li className="ml-6">
                  Monitor progress in the <strong>Jobs</strong> tab:
                  <ul className="list-disc list-inside ml-6 mt-1">
                    <li>See real-time phase updates</li>
                    <li>View product counts and success/failure rates</li>
                    <li>Live data updates every 3 seconds for running jobs</li>
                  </ul>
                </li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">4. View & Export Data</h2>
              <ol className="list-decimal list-inside space-y-2 text-gray-700 ml-4">
                <li>Click <strong>View Data</strong> on any completed job</li>
                <li>Browse scraped product data in a searchable table</li>
                <li>Click <strong>View Logs</strong> on any product to see detailed scraping diagnostics</li>
                <li className="ml-6">
                  Export data:
                  <ul className="list-disc list-inside ml-6 mt-1">
                    <li><strong>Export JSON</strong> - Structured JSON format</li>
                    <li><strong>Export CSV</strong> - Flat CSV with all fields</li>
                    <li><strong>Export Both</strong> - Get both formats</li>
                  </ul>
                </li>
              </ol>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Features</h2>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                <li>Profile Management - Create, edit, and organize scraping profiles</li>
                <li>Profile Explorer - Browse and use community-contributed public profiles</li>
                <li>GitHub Integration - Login with GitHub to publish and share profiles</li>
                <li>Profile Library System - Add/remove public profiles from your library</li>
                <li>Live Job Monitoring - Real-time progress tracking with phase updates</li>
                <li>Product-Level Logging - Detailed logs for each scraped product</li>
                <li>Concurrent Scraping - Configurable worker threads for parallel scraping</li>
                <li>Smart Field Extraction - CSS/XPath selectors with attribute support</li>
                <li>Advanced Pagination - Button, infinite scroll, and URL-based</li>
                <li>Bot Evasion - Comprehensive anti-detection with fingerprint randomization</li>
                <li>Checkpoint System - Resumable scraping with automatic progress saving</li>
                <li>Data Export - Export to CSV, JSON, or both formats</li>
                <li>Job History - View all past scraping jobs</li>
                <li>Import/Export Profiles - Share profiles as JSON files or URLs</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Data Storage</h2>
              <p className="text-gray-700 mb-3">
                All data is stored in <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                  ~/Library/Application Support/ProfileScraper/
                </code>
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                <li><code className="bg-gray-100 px-2 py-1 rounded text-sm">data/scraper.db</code> - SQLite database</li>
                <li><code className="bg-gray-100 px-2 py-1 rounded text-sm">logs/scrape.log</code> - Application logs</li>
                <li><code className="bg-gray-100 px-2 py-1 rounded text-sm">output/&#123;profileId&#125;/&#123;jobId&#125;/</code> - Job output and checkpoints</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Browser Management</h2>
              <p className="text-gray-700 mb-3">
                ProfileScraper requires Chromium browser binaries for web scraping. These are downloaded
                automatically on first run, but you can manage them manually here.
              </p>

              {browserInfo && (
                <div className="bg-gray-50 border border-gray-200 rounded p-4 mb-4">
                  <h3 className="font-bold text-gray-800 mb-2">Browser Status</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Installed:</span>
                      <span className={browserInfo.installed ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                        {browserInfo.installed ? '✓ Yes' : '✗ No'}
                      </span>
                    </div>
                    {browserInfo.path && (
                      <div className="flex items-start gap-2">
                        <span className="font-medium">Path:</span>
                        <code className="bg-white px-2 py-1 rounded text-xs break-all">{browserInfo.path}</code>
                      </div>
                    )}
                    {browserInfo.architecture && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Architecture:</span>
                        <span>{browserInfo.architecture}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={checkBrowserStatus}
                  disabled={isCheckingBrowsers}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCheckingBrowsers ? 'Checking...' : 'Check Status'}
                </button>
                <button
                  onClick={() => setShowBrowserDialog(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Download Browsers
                </button>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mt-4">
                <p className="text-sm text-gray-700">
                  <strong>Note:</strong> Browser downloads are architecture-specific (Intel x64 or Apple Silicon ARM64).
                  The correct version for your Mac will be automatically selected during download.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Bot Evasion</h2>
              <p className="text-gray-700 mb-3">
                ProfileScraper includes comprehensive anti-detection measures:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                <li>Randomized user agents across Chrome versions</li>
                <li>Varied viewport sizes per worker</li>
                <li>Hardware specs randomization (CPU cores, memory, battery)</li>
                <li>WebGL vendor spoofing</li>
                <li>Navigator properties masking</li>
                <li>Human-like behavior simulation (mouse movements, timing variations)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Version</h2>
              <p className="text-gray-700">v1.5.2</p>
            </section>
          </div>
        </div>
      </div>

      <BrowserDownloadDialog
        isOpen={showBrowserDialog}
        onClose={() => setShowBrowserDialog(false)}
        onComplete={handleBrowserDownloadComplete}
      />
    </div>
  );
}
