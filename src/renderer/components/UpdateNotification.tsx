import { useState, useEffect } from 'react';
import type { UpdateInfo } from '../types/electron';

export default function UpdateNotification() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkForUpdates();
  }, []);

  const checkForUpdates = async () => {
    try {
      setChecking(true);
      const info = await window.electronAPI.checkForUpdates();
      setUpdateInfo(info);
    } catch (error) {
      console.error('Failed to check for updates:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleDownload = () => {
    if (updateInfo?.releaseUrl) {
      window.electronAPI.openReleaseUrl(updateInfo.releaseUrl);
    }
  };

  if (checking || !updateInfo?.available || dismissed) {
    return null;
  }

  return (
    <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-3">
        <svg
          className="w-5 h-5 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
          <span className="font-medium">
            Version {updateInfo.latestVersion} is available!
          </span>
          <span className="text-blue-100 text-sm">
            (You have {updateInfo.currentVersion})
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleDownload}
          className="bg-white text-blue-600 px-4 py-1.5 rounded font-medium hover:bg-blue-50 transition-colors text-sm"
        >
          Download Update
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
