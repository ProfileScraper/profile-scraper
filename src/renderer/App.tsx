import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { ProfileLibrary } from './components/ProfileLibrary';
import { ProfileBuilder } from './components/ProfileBuilder';
import { JobsDashboard } from './components/JobsDashboard';
import { JobDataViewer } from './components/JobDataViewer';
import { ProfileExplorer } from './components/ProfileExplorer';
import { Help } from './components/Help';
import { BrowserDownloadDialog } from './components/BrowserDownloadDialog';
import './styles/index.css';

export function App() {
  const [showBrowserDialog, setShowBrowserDialog] = useState(false);
  const [hasCheckedBrowsers, setHasCheckedBrowsers] = useState(false);

  useEffect(() => {
    // Check browser installation on app mount
    const checkBrowsers = async () => {
      try {
        const result = await window.electronAPI.checkBrowsersInstalled();
        console.log('[App] Browser check result:', result);

        if (!result.installed) {
          console.log('[App] Browsers not installed, showing download dialog');
          setShowBrowserDialog(true);
        }
      } catch (error) {
        console.error('[App] Failed to check browser installation:', error);
      } finally {
        setHasCheckedBrowsers(true);
      }
    };

    checkBrowsers();
  }, []);

  const handleBrowserDownloadComplete = () => {
    setShowBrowserDialog(false);
    console.log('[App] Browser download complete');
  };

  return (
    <BrowserRouter>
      <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/profiles" replace />} />
            <Route path="/profiles" element={<ProfileLibrary />} />
            <Route path="/profiles/new" element={<ProfileBuilder />} />
            <Route path="/profiles/:id/edit" element={<ProfileBuilder />} />
            <Route path="/profile-explorer" element={<ProfileExplorer />} />
            <Route path="/jobs" element={<JobsDashboard />} />
            <Route path="/jobs/:id/data" element={<JobDataViewer />} />
            <Route path="/help" element={<Help />} />
          </Routes>
        </main>
      </div>

      <BrowserDownloadDialog
        isOpen={showBrowserDialog}
        onClose={() => setShowBrowserDialog(false)}
        onComplete={handleBrowserDownloadComplete}
      />
    </BrowserRouter>
  );
}
