import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { ProductData } from '../../shared/types';
import type { Job, JobLog } from '../types/electron';
import { ProductLogsModal } from './ProductLogsModal';

type SortDirection = 'asc' | 'desc' | null;
type SortField = 'url' | 'scrapedAt' | string; // string for dynamic field names

interface ProductWithId extends ProductData {
  id: number;
}

export function JobDataViewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [data, setData] = useState<ProductWithId[]>([]);
  const [logs, setLogs] = useState<JobLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [filterField, setFilterField] = useState<string>('');
  const [filterValue, setFilterValue] = useState<string>('');
  const [selectedProductForLogs, setSelectedProductForLogs] = useState<{ url: string; id: number } | null>(null);
  const [screenshotDataUrl, setScreenshotDataUrl] = useState<string | null>(null);
  const itemsPerPage = 50;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const logsEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const loadJobData = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const [jobData, productData, jobLogs] = await Promise.all([
          window.electronAPI.getJob(id),
          window.electronAPI.getJobData(id),
          window.electronAPI.getJobLogs(id),
        ]);

        setJob(jobData);
        setData(productData);
        setLogs(jobLogs);

        // Check if job failed with bot detection and has a screenshot
        console.log('[JobDataViewer] Job status:', jobData.status);
        console.log('[JobDataViewer] Error message:', jobData.errorMessage);

        if (jobData.status === 'failed' && jobData.errorMessage) {
          const screenshotMatch = jobData.errorMessage.match(/Screenshot saved to: (.+?)$/m);
          console.log('[JobDataViewer] Screenshot match result:', screenshotMatch);

          if (screenshotMatch && screenshotMatch[1]) {
            const screenshotPath = screenshotMatch[1].trim();
            console.log('[JobDataViewer] Loading bot detection screenshot from:', screenshotPath);

            try {
              const result = await window.electronAPI.getJobScreenshot(screenshotPath);
              console.log('[JobDataViewer] Screenshot load result:', result);

              if (result.success && result.dataUrl) {
                setScreenshotDataUrl(result.dataUrl);
                console.log('[JobDataViewer] Screenshot loaded successfully');
              } else {
                console.log('[JobDataViewer] Screenshot load failed:', result.error);
              }
            } catch (screenshotErr) {
              console.error('[JobDataViewer] Exception loading screenshot:', screenshotErr);
            }
          } else {
            console.log('[JobDataViewer] No screenshot path found in error message');
          }
        }
      } catch (err) {
        console.error('Failed to load job data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadJobData();

    // Set up live updates if job is running
    const setupLiveUpdates = async () => {
      if (!id) return;

      try {
        const jobData = await window.electronAPI.getJob(id);

        if (jobData.status === 'running') {
          // Refresh every 3 seconds while job is running
          intervalRef.current = setInterval(async () => {
            try {
              const [updatedJob, updatedData, updatedLogs] = await Promise.all([
                window.electronAPI.getJob(id),
                window.electronAPI.getJobData(id),
                window.electronAPI.getJobLogs(id),
              ]);

              setJob(updatedJob);
              setData(updatedData);
              setLogs(updatedLogs);

              // Stop refreshing if job is no longer running
              if (updatedJob.status !== 'running' && intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
              }
            } catch (err) {
              console.error('Failed to refresh job data:', err);
            }
          }, 3000);
        }
      } catch (err) {
        console.error('Failed to setup live updates:', err);
      }
    };

    setupLiveUpdates();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [id]);

  // Auto-scroll logs when new logs arrive and logs panel is open
  useEffect(() => {
    if (showLogs && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, showLogs]);

  const handleExport = async (format: 'json' | 'csv' | 'both') => {
    if (!id) return;

    try {
      const result = await window.electronAPI.exportJobData(id, format);
      if (result.success) {
        alert(`Data exported successfully to: ${result.path}`);
      } else {
        alert(result.message || 'Export canceled');
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // Get all unique field keys
  const allFields = Array.from(
    new Set(data.flatMap(p => Object.keys(p.fields)))
  ).sort();

  // Filter data based on search term and field filter
  let filteredData = data.filter(product => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || (
      product.url.toLowerCase().includes(searchLower) ||
      Object.values(product.fields).some(value =>
        value?.toString().toLowerCase().includes(searchLower)
      )
    );

    const matchesFilter = !filterField || !filterValue || (
      product.fields[filterField]?.toString().toLowerCase().includes(filterValue.toLowerCase())
    );

    return matchesSearch && matchesFilter;
  });

  // Sort data
  if (sortField && sortDirection) {
    filteredData = [...filteredData].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      if (sortField === 'url') {
        aVal = a.url;
        bVal = b.url;
      } else if (sortField === 'scrapedAt') {
        aVal = new Date(a.scrapedAt).getTime();
        bVal = new Date(b.scrapedAt).getTime();
      } else {
        aVal = a.fields[sortField] || '';
        bVal = b.fields[sortField] || '';
      }

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });
  }

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <span className="text-gray-400 ml-1">⇅</span>;
    }
    return (
      <span className="ml-1">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading job data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-white p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-lg">
          <h2 className="text-xl font-bold text-red-800 mb-2">Error</h2>
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => navigate('/jobs')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Back to Jobs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="h-[82px] px-6 border-b border-gray-400 flex items-center gap-4 shrink-0">
        <button
          onClick={() => navigate('/jobs')}
          className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
        >
          ← Back
        </button>
        <h1 className="text-xl font-bold text-gray-800">Job Data Viewer</h1>
      </div>

      {/* Job Info Bar */}
      {job && (
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-400 flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600">
              Job ID: <span className="font-mono">{job.id.substring(0, 8)}</span> | Status: <span className={job.status === 'running' ? 'text-blue-600 font-semibold' : job.status === 'failed' ? 'text-red-600 font-semibold' : 'font-medium'}>{job.status}</span>
              {job.status === 'running' && job.phase && (
                <span className="text-gray-500 italic"> ({
                  job.phase === 'initializing' ? 'Initializing' :
                  job.phase === 'gathering_urls' ? 'Gathering URLs' :
                  job.phase === 'crawling_products' ? 'Crawling Products' :
                  job.phase === 'finalizing' ? 'Finalizing' : ''
                })</span>
              )}
              {' '}| {filteredData.length} products
              {filteredData.length !== data.length && ` (${data.length} total)`}
              {' '}| {logs.length} logs
            </p>
            {job.status === 'running' && (
              <p className="text-xs text-blue-600 mt-1 flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"></span>
                Live updating every 3 seconds
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowLogs(!showLogs)}
              className={`px-3 py-1.5 text-sm rounded transition-colors font-medium ${
                showLogs
                  ? 'bg-gray-600 text-white hover:bg-gray-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {showLogs ? 'Hide Logs' : 'Show Logs'} ({logs.length})
            </button>
            <button
              onClick={() => handleExport('json')}
              className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors font-medium"
            >
              Export JSON
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="px-3 py-1.5 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors font-medium"
            >
              Export CSV
            </button>
            <button
              onClick={() => handleExport('both')}
              className="px-3 py-1.5 text-sm bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors font-medium"
            >
              Export Both
            </button>
          </div>
        </div>
      )}

      {/* Bot Detection Error & Screenshot */}
      {job && job.status === 'failed' && job.errorMessage && screenshotDataUrl && (
        <div className="mx-8 my-6 bg-red-50 border-2 border-red-300 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-900 mb-2">Job Failed: Bot Detection</h3>
              <p className="text-sm text-red-800 mb-4">{job.errorMessage}</p>

              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-semibold text-red-900 hover:text-red-700 select-none">
                  View Bot Detection Screenshot
                </summary>
                <div className="mt-4 border-2 border-red-400 rounded-lg overflow-hidden">
                  <img
                    src={screenshotDataUrl}
                    alt="Bot detection page screenshot"
                    className="w-full h-auto"
                  />
                </div>
              </details>
            </div>
          </div>
        </div>
      )}

      {/* Logs Panel */}
      {showLogs && (
        <div className="mx-8 my-6 bg-gray-50 border border-gray-400 rounded-lg">
          <div className="p-4 border-b border-gray-400 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-800">Job Logs</h2>
            {job?.status === 'running' && (
              <span className="text-xs text-blue-600 flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"></span>
                Live updating
              </span>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No logs available</div>
            ) : (
              <div className="divide-y divide-gray-200">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-3 text-sm ${
                      log.logLevel === 'error' ? 'bg-red-50' :
                      log.logLevel === 'warning' ? 'bg-yellow-50' :
                      log.logLevel === 'debug' ? 'bg-gray-50' :
                      'bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 min-w-[120px]">
                        <div className="text-xs text-gray-500">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </div>
                        <div className={`text-xs font-medium ${
                          log.logLevel === 'error' ? 'text-red-700' :
                          log.logLevel === 'warning' ? 'text-yellow-700' :
                          log.logLevel === 'debug' ? 'text-gray-600' :
                          'text-blue-700'
                        }`}>
                          {log.logLevel.toUpperCase()}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-600 mb-1 truncate" title={log.productUrl}>
                          {log.productUrl}
                        </div>
                        <div className="text-sm text-gray-800">{log.message}</div>
                        {log.fieldName && (
                          <div className="text-xs text-gray-600 mt-1">
                            Field: <span className="font-mono">{log.fieldName}</span>
                          </div>
                        )}
                        {log.selector && (
                          <div className="text-xs text-gray-600">
                            Selector: <span className="font-mono">{log.selector}</span>
                          </div>
                        )}
                        {log.elementCount !== undefined && (
                          <div className="text-xs text-gray-600">
                            Elements found: {log.elementCount}
                          </div>
                        )}
                        {log.errorMessage && (
                          <div className="text-xs text-red-700 mt-1">
                            Error: {log.errorMessage}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-full p-12">
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <div className="text-center">
              <p className="text-gray-500 text-lg">No data available for this job</p>
            </div>
          </div>
        ) : (
          <div className="mx-8 my-6 bg-gray-50 border border-gray-400 rounded-lg">
            {/* Search and Filter Controls */}
            <div className="p-4 border-b border-gray-400 space-y-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search all fields
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search products..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Field Filter */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filter by field
                  </label>
                  <select
                    value={filterField}
                    onChange={(e) => {
                      setFilterField(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">All fields</option>
                    {allFields.map(field => (
                      <option key={field} value={field}>{field}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filter value
                  </label>
                  <input
                    type="text"
                    value={filterValue}
                    onChange={(e) => {
                      setFilterValue(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Filter value..."
                    disabled={!filterField}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Clear Filters */}
              {(searchTerm || filterField || sortField) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterField('');
                    setFilterValue('');
                    setSortField(null);
                    setSortDirection(null);
                    setCurrentPage(1);
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Clear all filters and sorting
                </button>
              )}
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-400">
                  <tr>
                    <th
                      onClick={() => handleSort('url')}
                      className="px-4 py-3 text-left text-sm font-semibold text-gray-700 sticky left-0 bg-gray-50 cursor-pointer hover:bg-gray-100 select-none"
                    >
                      <div className="flex items-center">
                        URL
                        <SortIcon field="url" />
                      </div>
                    </th>
                    {allFields.map(field => (
                      <th
                        key={field}
                        onClick={() => handleSort(field)}
                        className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap cursor-pointer hover:bg-gray-100 select-none"
                      >
                        <div className="flex items-center">
                          {field}
                          <SortIcon field={field} />
                        </div>
                      </th>
                    ))}
                    <th
                      onClick={() => handleSort('scrapedAt')}
                      className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap cursor-pointer hover:bg-gray-100 select-none"
                    >
                      <div className="flex items-center">
                        Scraped At
                        <SortIcon field="scrapedAt" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedData.map((product, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-blue-600 max-w-xs sticky left-0 bg-white hover:bg-gray-50">
                        <a
                          href={product.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline truncate block"
                          title={product.url}
                        >
                          {product.url}
                        </a>
                      </td>
                      {allFields.map(field => (
                        <td key={field} className="px-4 py-3 text-sm text-gray-800 max-w-xs">
                          <div className="truncate" title={product.fields[field]?.toString()}>
                            {product.fields[field] || '-'}
                          </div>
                        </td>
                      ))}
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {new Date(product.scrapedAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        <button
                          onClick={() => setSelectedProductForLogs({ url: product.url, id: product.id })}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          View Logs
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center p-4 border-t border-gray-400">
                <div className="text-sm text-gray-600">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                  {Math.min(currentPage * itemsPerPage, filteredData.length)} of{' '}
                  {filteredData.length} products
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="px-4 py-2 text-sm text-gray-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Product Logs Modal */}
      {selectedProductForLogs && (
        <ProductLogsModal
          productUrl={selectedProductForLogs.url}
          productId={selectedProductForLogs.id}
          onClose={() => setSelectedProductForLogs(null)}
        />
      )}
    </div>
  );
}
