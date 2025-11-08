import React, { useState, useEffect } from 'react';
import type { ProductLog, LogLevel } from '../types/electron';

interface ProductLogsModalProps {
  productUrl: string;
  productId: number;
  onClose: () => void;
}

export function ProductLogsModal({ productUrl, productId, onClose }: ProductLogsModalProps) {
  const [logs, setLogs] = useState<ProductLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState<LogLevel | 'all'>('all');

  useEffect(() => {
    const loadLogs = async () => {
      try {
        setLoading(true);
        const productLogs = await window.electronAPI.getProductLogs(productId);
        setLogs(productLogs);
      } catch (error) {
        console.error('Failed to load product logs:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
  }, [productId]);

  const filteredLogs = filterLevel === 'all'
    ? logs
    : logs.filter(log => log.logLevel === filterLevel);

  const getLogLevelColor = (level: LogLevel): string => {
    switch (level) {
      case 'error': return 'text-red-600 bg-red-50';
      case 'warning': return 'text-orange-600 bg-orange-50';
      case 'info': return 'text-blue-600 bg-blue-50';
      case 'debug': return 'text-gray-600 bg-gray-50';
    }
  };

  const getLogLevelBadgeColor = (level: LogLevel): string => {
    switch (level) {
      case 'error': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-orange-100 text-orange-800';
      case 'info': return 'bg-blue-100 text-blue-800';
      case 'debug': return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  };

  const logCounts = {
    all: logs.length,
    error: logs.filter(l => l.logLevel === 'error').length,
    warning: logs.filter(l => l.logLevel === 'warning').length,
    info: logs.filter(l => l.logLevel === 'info').length,
    debug: logs.filter(l => l.logLevel === 'debug').length,
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b border-gray-400 px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Crawler Logs</h2>
              <p className="text-sm text-gray-600 mt-1 truncate max-w-2xl" title={productUrl}>
                {productUrl}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Log Level Filters */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setFilterLevel('all')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                filterLevel === 'all'
                  ? 'bg-gray-200 text-gray-800'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              All ({logCounts.all})
            </button>
            {logCounts.error > 0 && (
              <button
                onClick={() => setFilterLevel('error')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  filterLevel === 'error'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-red-50 text-red-600 hover:bg-red-100'
                }`}
              >
                Errors ({logCounts.error})
              </button>
            )}
            {logCounts.warning > 0 && (
              <button
                onClick={() => setFilterLevel('warning')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  filterLevel === 'warning'
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                }`}
              >
                Warnings ({logCounts.warning})
              </button>
            )}
            <button
              onClick={() => setFilterLevel('info')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                filterLevel === 'info'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
              }`}
            >
              Info ({logCounts.info})
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                {filterLevel === 'all' ? 'No logs found for this product' : `No ${filterLevel} logs found`}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className={`rounded-lg p-4 border ${getLogLevelColor(log.logLevel)}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${getLogLevelBadgeColor(log.logLevel)}`}>
                          {log.logLevel}
                        </span>
                        <span className="text-xs text-gray-500 font-mono">
                          {formatTimestamp(log.timestamp)}
                        </span>
                        {log.fieldName && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                            {log.fieldName}
                          </span>
                        )}
                      </div>

                      <p className="text-sm font-medium text-gray-900 mb-1">
                        {log.message}
                      </p>

                      {log.selector && (
                        <div className="mt-2 p-2 bg-gray-900 rounded text-xs font-mono text-green-400 overflow-x-auto">
                          {log.selector}
                        </div>
                      )}

                      {log.elementCount !== undefined && (
                        <p className="text-xs text-gray-600 mt-1">
                          Elements found: <span className="font-bold">{log.elementCount}</span>
                        </p>
                      )}

                      {log.errorMessage && (
                        <div className="mt-2 p-2 bg-red-900 bg-opacity-10 border border-red-200 rounded text-xs text-red-800">
                          <strong>Error:</strong> {log.errorMessage}
                        </div>
                      )}

                      {log.context && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                            Show context
                          </summary>
                          <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                            {log.context}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-400 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
