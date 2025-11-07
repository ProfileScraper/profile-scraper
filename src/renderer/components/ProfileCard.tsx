import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExportWarningDialog } from './ExportWarningDialog';

interface ProfileCardProps {
  id: string;
  name: string;
  categoryUrl: string;
  createdAt: number;
  isReadonly?: boolean;
  isPublic?: boolean;
  sourceProfileId?: string;
  author?: string;
  description?: string;
  onDelete: (id: string) => void;
  onRun: (id: string) => void;
}

export function ProfileCard({
  id,
  name,
  categoryUrl,
  createdAt,
  isReadonly,
  isPublic,
  sourceProfileId,
  author,
  description,
  onDelete,
  onRun
}: ProfileCardProps) {
  const navigate = useNavigate();
  const createdDate = new Date(createdAt).toLocaleDateString();
  const [showExportDialog, setShowExportDialog] = useState(false);

  const getDomain = (url: string): string => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url;
    }
  };

  const handleExport = async () => {
    const result = await window.electronAPI.exportProfile(id);
    if (result.success) {
      console.log('Exported to:', result.filePath);
    }
    setShowExportDialog(false);
  };

  const handleClone = async () => {
    const result = await window.electronAPI.cloneProfile(id);
    if (result.success) {
      navigate(`/profiles/${result.profileId}/edit`);
    }
  };

  return (
    <div className={`rounded-lg shadow p-6 hover:shadow-lg transition-shadow ${
      isReadonly ? 'border-2 border-blue-300 bg-blue-50' : 'bg-white'
    }`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-lg font-semibold text-gray-800">{name}</h3>
            {isReadonly && (
              <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded flex-shrink-0">
                Public
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1">{getDomain(categoryUrl)}</p>
        </div>
      </div>

      {description && (
        <p className="text-sm text-gray-700 mb-3">{description}</p>
      )}

      {sourceProfileId && author && (
        <p className="text-xs text-gray-500 mb-3">
          Cloned from: {author}
        </p>
      )}

      <div className="text-xs text-gray-400 mb-4">
        Created: {createdDate}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onRun(id)}
          className="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors text-sm font-medium"
        >
          Run
        </button>

        {!isReadonly ? (
          <>
            <button
              onClick={() => navigate(`/profiles/${id}/edit`)}
              className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 transition-colors text-sm font-medium"
            >
              Edit
            </button>
            <button
              onClick={() => setShowExportDialog(true)}
              className="bg-green-100 text-green-600 px-4 py-2 rounded hover:bg-green-200 transition-colors text-sm font-medium"
            >
              Export
            </button>
            <button
              onClick={() => {
                if (confirm(`Delete profile "${name}"?`)) {
                  onDelete(id);
                }
              }}
              className="bg-red-100 text-red-600 px-4 py-2 rounded hover:bg-red-200 transition-colors text-sm font-medium"
            >
              Delete
            </button>
          </>
        ) : (
          <button
            onClick={handleClone}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Clone to Edit
          </button>
        )}
      </div>

      {/* Export Warning Dialog */}
      {showExportDialog && (
        <ExportWarningDialog
          profileName={name}
          onConfirm={handleExport}
          onCancel={() => setShowExportDialog(false)}
        />
      )}
    </div>
  );
}
