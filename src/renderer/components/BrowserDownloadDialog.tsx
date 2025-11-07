import React, { useState, useEffect } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function BrowserDownloadDialog({ isOpen, onClose, onComplete }: Props) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      // Reset state when dialog closes
      setIsDownloading(false);
      setProgress('');
      setError('');
      setIsComplete(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    // Listen for progress updates
    const cleanup = window.electronAPI.onBrowserDownloadProgress((message: string) => {
      console.log('[BrowserDownload] Progress:', message);
      setProgress(message);
    });

    return cleanup;
  }, [isOpen]);

  const handleDownload = async () => {
    setIsDownloading(true);
    setError('');
    setProgress('Initializing browser download...');

    try {
      const result = await window.electronAPI.downloadBrowsers();

      if (result.success) {
        setIsComplete(true);
        setProgress('Browser download complete!');
        setTimeout(() => {
          onComplete();
        }, 1500);
      } else {
        setError(result.error || 'Unknown error occurred');
      }
    } catch (err) {
      console.error('[BrowserDownload] Download failed:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100]">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
        <h2 className="text-xl font-semibold mb-4">Browser Setup Required</h2>

        {!isDownloading && !isComplete && (
          <>
            <p className="mb-4">
              ProfileScraper requires Chromium browser binaries to perform web scraping.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
              <p className="text-sm text-blue-800">
                <strong>First-time setup:</strong> This will download approximately 120-150MB of browser files
                to your application data directory. The download may take 2-5 minutes depending on your
                internet connection.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                <p className="text-sm text-red-800">
                  <strong>Error:</strong> {error}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 border rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Download Browsers
              </button>
            </div>
          </>
        )}

        {isDownloading && (
          <>
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <span className="text-sm font-medium">Downloading...</span>
              </div>

              {progress && (
                <div className="bg-gray-50 border border-gray-200 rounded p-3 mt-2">
                  <p className="text-sm text-gray-700 font-mono whitespace-pre-wrap break-all">
                    {progress}
                  </p>
                </div>
              )}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
              <p className="text-sm text-yellow-800">
                Please keep this window open while the download completes. This may take several minutes.
              </p>
            </div>
          </>
        )}

        {isComplete && (
          <>
            <div className="bg-green-50 border border-green-200 rounded p-3 mb-4">
              <p className="text-sm text-green-800">
                ✓ Browser setup complete! You can now start scraping.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
