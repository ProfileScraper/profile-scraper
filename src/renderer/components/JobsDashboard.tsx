import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScraper } from '../hooks/useScraper';
import type { Job } from '../types/electron';

interface JobHistoryItem {
  id: string;
  profileName: string;
  startedAt: string;
  duration: number;
  status: 'completed' | 'failed' | 'stopped';
  totalProducts: number;
  successCount: number;
  failCount: number;
}

type FilterType = 'all' | 'completed' | 'failed' | 'last7days';

export function JobsDashboard() {
  const navigate = useNavigate();
  const {
    isRunning,
    isPaused,
    progress,
    products,
    errors,
    pauseScrape,
    resumeScrape,
    stopScrape,
  } = useScraper();

  const [jobHistory, setJobHistory] = useState<JobHistoryItem[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const itemsPerPage = 10;

  // Track elapsed time
  useEffect(() => {
    if (isRunning && !startTime) {
      setStartTime(Date.now());
    }
    if (!isRunning) {
      setStartTime(null);
      setElapsedTime(0);
    }
  }, [isRunning]);

  useEffect(() => {
    if (!isRunning || isPaused) return;

    const interval = setInterval(() => {
      if (startTime) {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, isPaused, startTime]);

  // Load job history from database
  useEffect(() => {
    const loadJobHistory = async () => {
      try {
        const jobs = await window.electronAPI.getAllJobs();
        const profiles = await window.electronAPI.getAllProfiles();

        // Create a map of profile IDs to names for quick lookup
        const profileMap = new Map(profiles.map(p => [p.id, p.name]));

        // Transform Job data to JobHistoryItem format
        const history: JobHistoryItem[] = jobs
          .filter(job => job.status !== 'running') // Exclude currently running jobs
          .map(job => {
            const duration = job.completedAt
              ? Math.floor((job.completedAt - job.startedAt) / 1000)
              : 0;

            return {
              id: job.id,
              profileName: profileMap.get(job.profileId) || 'Unknown Profile',
              startedAt: new Date(job.startedAt).toISOString(),
              duration,
              status: job.status as 'completed' | 'failed' | 'stopped',
              totalProducts: job.totalProducts || 0,
              successCount: job.successCount || 0,
              failCount: job.failCount || 0,
            };
          });

        setJobHistory(history);
      } catch (error) {
        console.error('Failed to load job history:', error);
      }
    };

    loadJobHistory();

    // Refresh job history every 30 seconds
    const intervalId = setInterval(loadJobHistory, 30000);

    return () => clearInterval(intervalId);
  }, []);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const formatDateTime = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateSuccessRate = (success: number, total: number): number => {
    if (total === 0) return 0;
    return Math.round((success / total) * 100);
  };

  const calculateETA = (): number | null => {
    if (!progress || !startTime || progress.productsScraped === 0) return null;

    const elapsed = (Date.now() - startTime) / 1000;
    const rate = progress.productsScraped / elapsed;
    const remaining = progress.totalProducts - progress.productsScraped;

    return Math.floor(remaining / rate);
  };

  const getFilteredHistory = (): JobHistoryItem[] => {
    let filtered = [...jobHistory];

    if (filter === 'completed') {
      filtered = filtered.filter(job => job.status === 'completed');
    } else if (filter === 'failed') {
      filtered = filtered.filter(job => job.status === 'failed');
    } else if (filter === 'last7days') {
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      filtered = filtered.filter(job => new Date(job.startedAt).getTime() > sevenDaysAgo);
    }

    return filtered;
  };

  const filteredHistory = getFilteredHistory();
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const paginatedHistory = filteredHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleExport = (jobId: string) => {
    console.log('Export job:', jobId);
    // TODO: Implement export functionality
  };

  const handleJobClick = (jobId: string) => {
    navigate(`/jobs/${jobId}`);
  };

  const eta = calculateETA();

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Jobs Dashboard</h1>

      {/* Current Job Panel */}
      {isRunning && progress && (
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Current Job</h2>
            <div className="flex gap-2">
              {isPaused ? (
                <button
                  onClick={resumeScrape}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors font-medium"
                >
                  Resume
                </button>
              ) : (
                <button
                  onClick={pauseScrape}
                  className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors font-medium"
                >
                  Pause
                </button>
              )}
              <button
                onClick={stopScrape}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors font-medium"
              >
                Stop
              </button>
              <button
                onClick={() => navigate(`/jobs/current`)}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                View Details
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Progress</span>
              <span className="text-sm font-bold text-gray-800">
                {Math.round((progress.productsScraped / progress.totalProducts) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="bg-blue-500 h-4 rounded-full transition-all duration-300"
                style={{
                  width: `${(progress.productsScraped / progress.totalProducts) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Products</div>
              <div className="text-2xl font-bold text-gray-800">
                {progress.productsScraped} / {progress.totalProducts}
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-green-700 mb-1">Success</div>
              <div className="text-2xl font-bold text-green-600">
                {progress.successCount}
              </div>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <div className="text-sm text-red-700 mb-1">Failed</div>
              <div className="text-2xl font-bold text-red-600">
                {progress.failCount}
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-blue-700 mb-1">Elapsed</div>
              <div className="text-2xl font-bold text-blue-600">
                {formatDuration(elapsedTime)}
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-sm text-purple-700 mb-1">ETA</div>
              <div className="text-2xl font-bold text-purple-600">
                {eta !== null ? formatDuration(eta) : '--'}
              </div>
            </div>
          </div>

          {/* Live Worker Status */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Active Workers</h3>
            <div className="space-y-2">
              {progress.currentUrls.length === 0 ? (
                <div className="text-gray-500 text-sm italic">
                  {isPaused ? 'Workers paused' : 'Waiting for workers...'}
                </div>
              ) : (
                progress.currentUrls.map((url, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 bg-gray-50 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full font-medium text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-700 mb-1">
                        Worker {index + 1}
                      </div>
                      <div className="text-xs text-gray-500 truncate" title={url}>
                        {url}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isPaused ? (
                        <span className="flex items-center gap-1 text-yellow-600 text-sm">
                          <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                          Paused
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-green-600 text-sm">
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                          Processing
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Job History Section */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Job History</h2>
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Filter:</label>
            <select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value as FilterType);
                setCurrentPage(1);
              }}
              className="border border-gray-300 rounded-lg px-4 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Jobs</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="last7days">Last 7 Days</option>
            </select>
          </div>
        </div>

        {paginatedHistory.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="w-16 h-16 mx-auto text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <p className="text-gray-500">No jobs found</p>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Profile Name
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Started At
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Duration
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Products
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Success Rate
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedHistory.map((job) => {
                    const successRate = calculateSuccessRate(
                      job.successCount,
                      job.totalProducts
                    );

                    return (
                      <tr
                        key={job.id}
                        onClick={() => handleJobClick(job.id)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-4 text-sm font-medium text-gray-800">
                          {job.profileName}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {formatDateTime(job.startedAt)}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {formatDuration(job.duration)}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              job.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : job.status === 'failed'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          <div className="flex flex-col">
                            <span className="font-medium">{job.totalProducts}</span>
                            <span className="text-xs text-gray-500">
                              {job.successCount} success / {job.failCount} failed
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 min-w-[60px]">
                              <div
                                className={`h-2 rounded-full ${
                                  successRate >= 90
                                    ? 'bg-green-500'
                                    : successRate >= 70
                                    ? 'bg-yellow-500'
                                    : 'bg-red-500'
                                }`}
                                style={{ width: `${successRate}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-gray-700 min-w-[40px]">
                              {successRate}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExport(job.id);
                            }}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Export
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                  {Math.min(currentPage * itemsPerPage, filteredHistory.length)} of{' '}
                  {filteredHistory.length} jobs
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium ${
                          currentPage === page
                            ? 'bg-blue-500 text-white'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
