import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useScraper } from '../hooks/useScraper';
import logoImg from '../assets/logo.png';

export function Sidebar() {
  const navigate = useNavigate();
  const { isRunning } = useScraper();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [runningJobsCount, setRunningJobsCount] = useState(0);
  const [totalProgress, setTotalProgress] = useState<{ scraped: number; total: number } | null>(null);

  useEffect(() => {
    checkAuthStatus();
    fetchJobStatus();

    // Poll for job status every 3 seconds
    const interval = setInterval(fetchJobStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchJobStatus = async () => {
    try {
      const jobs = await window.electronAPI.getAllJobs({ status: 'running' });
      setRunningJobsCount(jobs.length);

      if (jobs.length > 0) {
        // Calculate total progress across all running jobs
        const total = jobs.reduce((sum: number, job: any) => sum + (job.products_total || 0), 0);
        const scraped = jobs.reduce((sum: number, job: any) => sum + (job.products_scraped || 0), 0);
        setTotalProgress({ scraped, total });
      } else {
        setTotalProgress(null);
      }
    } catch (error) {
      console.error('Failed to fetch job status:', error);
      setRunningJobsCount(0);
      setTotalProgress(null);
    }
  };

  const checkAuthStatus = async () => {
    try {
      const status = await window.electronAPI.githubAuthStatus();
      setIsAuthenticated(status.authenticated);

      if (status.authenticated && status.user) {
        setUsername(status.user.login);
      } else {
        setUsername(null);
      }
    } catch (error) {
      console.error('Failed to check auth status:', error);
      setIsAuthenticated(false);
      setUsername(null);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.githubAuthStart();
      if (result.success) {
        await checkAuthStatus();
      }
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await window.electronAPI.githubAuthLogout();
      setIsAuthenticated(false);
      setUsername(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center px-4 py-3 text-sm font-medium transition-colors ${
      isActive
        ? 'bg-blue-500 text-white'
        : 'text-gray-700 hover:bg-gray-200'
    }`;

  return (
    <aside className="w-64 bg-white shadow-lg flex flex-col border-r border-gray-400">
      <div className="h-[82px] px-6 border-b border-gray-400 flex items-center gap-3">
        <img src={logoImg} alt="ProfileScraper" className="w-10 h-10 rounded-lg" />
        <h1 className="text-xl font-bold text-gray-800">ProfileScraper</h1>
      </div>

      <nav className="flex-1 py-4">
        <NavLink to="/profiles" className={navLinkClass}>
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Profiles
        </NavLink>

        <NavLink to="/profile-explorer" className={navLinkClass}>
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Profile Explorer
        </NavLink>

        <NavLink to="/jobs" className={navLinkClass}>
          <div className="flex items-center flex-1">
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Jobs
            {isRunning && (
              <span className="ml-auto w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            )}
          </div>
        </NavLink>

        <NavLink to="/help" className={navLinkClass}>
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Help
        </NavLink>
      </nav>

      <div className="border-t border-gray-400">
        {isAuthenticated ? (
          <div className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-gray-800">@{username}</span>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full px-3 py-2 text-sm bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              {loading ? 'Logging in...' : 'Login with GitHub'}
            </button>
          </div>
        )}

        {/* Job Status Metrics */}
        {runningJobsCount > 0 && (
          <button
            onClick={() => navigate('/jobs')}
            className="w-full px-4 py-3 border-t border-gray-300 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
          >
            <div className="text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 font-medium">Active Jobs</span>
                <span className="text-blue-600 font-semibold">{runningJobsCount}</span>
              </div>
              {totalProgress && totalProgress.total > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Progress</span>
                  <span className="text-gray-800 font-medium">
                    {Math.round((totalProgress.scraped / totalProgress.total) * 100)}%
                  </span>
                </div>
              )}
            </div>
          </button>
        )}

        <div className="px-4 pb-2 text-xs text-gray-500 text-center">
          v{window.electronAPI.getVersion()}
        </div>
      </div>
    </aside>
  );
}
