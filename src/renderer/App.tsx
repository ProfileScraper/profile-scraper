import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { ProfileLibrary } from './components/ProfileLibrary';
import { ProfileBuilder } from './components/ProfileBuilder';
import { JobsDashboard } from './components/JobsDashboard';
import { JobDataViewer } from './components/JobDataViewer';
import { Dashboard } from './components/Dashboard';
import './styles/index.css';

export function App() {
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
            <Route path="/jobs" element={<JobsDashboard />} />
            <Route path="/jobs/:id/data" element={<JobDataViewer />} />
            <Route path="/legacy" element={<Dashboard />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
