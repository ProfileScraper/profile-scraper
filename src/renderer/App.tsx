import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { ProfileLibrary } from './components/ProfileLibrary';
import { ProfileBuilder } from './components/ProfileBuilder';
import { JobsDashboard } from './components/JobsDashboard';
import { JobDataViewer } from './components/JobDataViewer';
import { ProfileExplorer } from './components/ProfileExplorer';
import { Help } from './components/Help';
import UpdateNotification from './components/UpdateNotification';
import TrustCertificateModal from './components/TrustCertificateModal';
import './styles/index.css';

export function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen bg-gray-100 flex-col">
        <UpdateNotification />
        <TrustCertificateModal />
        <div className="flex flex-1 min-h-0">
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
      </div>
    </BrowserRouter>
  );
}
