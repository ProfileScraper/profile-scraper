import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { ProductData } from '../../shared/types';
import type { Job } from '../types/electron';

export function JobDataViewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [data, setData] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const itemsPerPage = 50;

  useEffect(() => {
    const loadJobData = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const [jobData, productData] = await Promise.all([
          window.electronAPI.getJob(id),
          window.electronAPI.getJobData(id),
        ]);

        setJob(jobData);
        setData(productData);
      } catch (err) {
        console.error('Failed to load job data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadJobData();
  }, [id]);

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

  // Filter data based on search term
  const filteredData = data.filter(product => {
    const searchLower = searchTerm.toLowerCase();
    return (
      product.url.toLowerCase().includes(searchLower) ||
      Object.values(product.fields).some(value =>
        value?.toString().toLowerCase().includes(searchLower)
      )
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Get all unique field keys
  const allFields = Array.from(
    new Set(data.flatMap(p => Object.keys(p.fields)))
  ).sort();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading job data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <button
              onClick={() => navigate('/jobs')}
              className="text-blue-600 hover:text-blue-800 mb-2 flex items-center gap-1"
            >
              ← Back to Jobs
            </button>
            <h1 className="text-3xl font-bold text-gray-800">Job Data Viewer</h1>
            {job && (
              <p className="text-gray-600 mt-2">
                Job ID: {job.id} | Status: {job.status} | {data.length} products
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleExport('json')}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              Export JSON
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
            >
              Export CSV
            </button>
            <button
              onClick={() => handleExport('both')}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium"
            >
              Export Both
            </button>
          </div>
        </div>

        {data.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
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
            <p className="text-gray-500 text-lg">No data available for this job</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow">
            {/* Search */}
            <div className="p-4 border-b border-gray-200">
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

            {/* Data Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 sticky left-0 bg-gray-50">
                      URL
                    </th>
                    {allFields.map(field => (
                      <th key={field} className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                        {field}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 whitespace-nowrap">
                      Scraped At
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedData.map((product, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-blue-600 max-w-xs truncate sticky left-0 bg-white hover:bg-gray-50">
                        <a href={product.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center p-4 border-t border-gray-200">
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
    </div>
  );
}
