import { useState, useEffect } from 'react';

interface UpdateAvailableInfo {
  version: string;
  releaseNotes?: string;
  releaseDate?: string;
}

interface DownloadProgress {
  percent: number;
  transferred: number;
  total: number;
}

export default function UpdateNotification() {
  const [updateAvailable, setUpdateAvailable] = useState<UpdateAvailableInfo | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [readyToInstall, setReadyToInstall] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Listen for update available
    const unsubscribeAvailable = window.electronAPI.onUpdateAvailable((info: UpdateAvailableInfo) => {
      console.log('[UpdateNotification] Update available:', info);
      setUpdateAvailable(info);
    });

    // Listen for download progress
    const unsubscribeProgress = window.electronAPI.onDownloadProgress((progress: DownloadProgress) => {
      console.log('[UpdateNotification] Download progress:', progress);
      setDownloadProgress(progress);
    });

    // Listen for update downloaded
    const unsubscribeDownloaded = window.electronAPI.onUpdateDownloaded((info: { version: string }) => {
      console.log('[UpdateNotification] Update downloaded:', info);
      setDownloading(false);
      setReadyToInstall(true);
    });

    // Listen for errors
    const unsubscribeError = window.electronAPI.onUpdateError((err: string) => {
      console.error('[UpdateNotification] Update error:', err);
      setError(err);
      setDownloading(false);
    });

    // Cleanup function
    return () => {
      unsubscribeAvailable();
      unsubscribeProgress();
      unsubscribeDownloaded();
      unsubscribeError();
    };
  }, []);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      setError(null);
      await window.electronAPI.downloadUpdate();
    } catch (err) {
      console.error('Failed to start download:', err);
      setError('Failed to start download');
      setDownloading(false);
    }
  };

  const handleInstall = () => {
    window.electronAPI.quitAndInstall();
  };

  if (dismissed || (!updateAvailable && !readyToInstall)) {
    return null;
  }

  // Ready to install state
  if (readyToInstall) {
    return (
      <div className="bg-green-600 text-white px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">Update downloaded and ready to install!</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleInstall}
            className="bg-white text-green-600 px-4 py-1.5 rounded font-medium hover:bg-green-50 transition-colors text-sm"
          >
            Restart Now
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="text-green-100 hover:text-white p-1 transition-colors"
            aria-label="Dismiss"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // Downloading state
  if (downloading && downloadProgress) {
    return (
      <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3 flex-1">
          <svg className="w-5 h-5 flex-shrink-0 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium">Downloading update...</span>
              <span className="text-sm">{Math.round(downloadProgress.percent)}%</span>
            </div>
            <div className="w-full bg-blue-800 rounded-full h-2">
              <div
                className="bg-white h-2 rounded-full transition-all duration-300"
                style={{ width: `${downloadProgress.percent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-600 text-white px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">Update failed: {error}</span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-red-100 hover:text-white p-1 transition-colors"
          aria-label="Dismiss"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  }

  // Update available state
  return (
    <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-3">
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span className="font-medium">
          Version {updateAvailable?.version} is available!
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="bg-white text-blue-600 px-4 py-1.5 rounded font-medium hover:bg-blue-50 transition-colors text-sm disabled:opacity-50"
        >
          {downloading ? 'Starting...' : 'Download Update'}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="text-blue-100 hover:text-white p-1 transition-colors"
          aria-label="Dismiss"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
