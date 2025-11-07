import React, { useState } from 'react';

interface ImportResult {
  success: boolean;
  profileId?: string;
  errors?: string[];
  warnings?: string[];
}

interface Props {
  onClose: () => void;
  onImportSuccess: () => void;
}

export function ImportDialog({ onClose, onImportSuccess }: Props) {
  const [activeTab, setActiveTab] = useState<'file' | 'url'>('file');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFileImport = async () => {
    setLoading(true);
    setResult(null);

    try {
      const importResult = await window.electronAPI.importProfileFromFile();
      setResult(importResult);

      if (importResult.success) {
        setTimeout(() => {
          onImportSuccess();
          onClose();
        }, 1500);
      }
    } catch (error: any) {
      setResult({
        success: false,
        errors: [error.message],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUrlImport = async () => {
    if (!url.trim()) {
      setResult({ success: false, errors: ['Please enter a URL'] });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const importResult = await window.electronAPI.importProfileFromURL(url);
      setResult(importResult);

      if (importResult.success) {
        setTimeout(() => {
          onImportSuccess();
          onClose();
        }, 1500);
      }
    } catch (error: any) {
      setResult({
        success: false,
        errors: [error.message],
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
        <h2 className="text-xl font-semibold mb-4">Import Profile</h2>

        {/* Tabs */}
        <div className="flex border-b mb-4">
          <button
            onClick={() => setActiveTab('file')}
            className={`px-4 py-2 ${activeTab === 'file' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            Import File
          </button>
          <button
            onClick={() => setActiveTab('url')}
            className={`px-4 py-2 ${activeTab === 'url' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
          >
            Import from URL
          </button>
        </div>

        {/* File Import */}
        {activeTab === 'file' && (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Select a .json profile file to import
            </p>
            <button
              onClick={handleFileImport}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Importing...' : 'Choose File'}
            </button>
          </div>
        )}

        {/* URL Import */}
        {activeTab === 'url' && (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Paste a URL to a profile JSON file (GitHub raw link, CDN, etc.)
            </p>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://raw.githubusercontent.com/..."
              className="w-full px-3 py-2 border rounded mb-3"
            />
            <button
              onClick={handleUrlImport}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Importing...' : 'Import from URL'}
            </button>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className={`mt-4 p-3 rounded ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            {result.success ? (
              <p className="text-green-800">Profile imported successfully!</p>
            ) : (
              <div>
                <p className="text-red-800 font-semibold mb-2">Import failed:</p>
                <ul className="text-sm text-red-700 list-disc list-inside">
                  {result.errors?.map((error, i) => <li key={i}>{error}</li>)}
                </ul>
              </div>
            )}

            {result.warnings && result.warnings.length > 0 && (
              <div className="mt-2">
                <p className="text-yellow-800 text-sm font-semibold">Warnings:</p>
                <ul className="text-xs text-yellow-700 list-disc list-inside">
                  {result.warnings.map((warning, i) => <li key={i}>{warning}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
