import React from 'react';
import { useScraper } from '../hooks/useScraper';

export function Dashboard() {
  const {
    isRunning,
    isPaused,
    progress,
    startScrape,
    pauseScrape,
    resumeScrape,
    stopScrape,
  } = useScraper();

  const [profileName, setProfileName] = React.useState('example-site');

  const handleStart = () => {
    startScrape(profileName);
  };

  const percentage = progress
    ? Math.round((progress.productsScraped / progress.totalProducts) * 100)
    : 0;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Web Scraper Dashboard</h1>

      {/* Controls */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Controls</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Profile</label>
          <input
            type="text"
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            className="border rounded px-3 py-2 w-full"
            disabled={isRunning}
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleStart}
            disabled={isRunning}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            Start
          </button>

          {isRunning && !isPaused && (
            <button
              onClick={pauseScrape}
              className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
            >
              Pause
            </button>
          )}

          {isRunning && isPaused && (
            <button
              onClick={resumeScrape}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Resume
            </button>
          )}

          {isRunning && (
            <button
              onClick={stopScrape}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Stop
            </button>
          )}
        </div>
      </div>

      {/* Progress */}
      {progress && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Progress</h2>

          <div className="mb-4">
            <div className="flex justify-between mb-2">
              <span>Products Scraped</span>
              <span className="font-semibold">
                {progress.productsScraped} / {progress.totalProducts}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-blue-500 h-4 rounded-full transition-all"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="text-center mt-1 text-sm text-gray-600">{percentage}%</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600">Success</div>
              <div className="text-2xl font-bold text-green-600">{progress.successCount}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Failed</div>
              <div className="text-2xl font-bold text-red-600">{progress.failCount}</div>
            </div>
          </div>

          {progress.currentUrls.length > 0 && (
            <div className="mt-4">
              <div className="text-sm font-medium mb-2">Currently Processing:</div>
              <div className="text-xs text-gray-600 space-y-1">
                {progress.currentUrls.map((url, i) => (
                  <div key={i} className="truncate">{url}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
