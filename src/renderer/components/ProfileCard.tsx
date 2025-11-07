import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExportWarningDialog } from './ExportWarningDialog';
import { PublishProfileDialog } from './PublishProfileDialog';
import { ProfileWithMetadata } from '../../shared/types';

interface ProfileCardProps {
  id: string;
  name: string;
  categoryUrl: string;
  createdAt: number;
  isReadonly?: boolean;
  isPublic?: boolean;
  inLibrary?: boolean;
  sourceProfileId?: string;
  author?: string;
  description?: string;
  hideClone?: boolean;
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
  inLibrary,
  sourceProfileId,
  author,
  description,
  hideClone,
  onDelete,
  onRun
}: ProfileCardProps) {
  const navigate = useNavigate();
  const createdDate = createdAt && !isNaN(createdAt)
    ? new Date(createdAt).toLocaleDateString()
    : 'Unknown';
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [profileData, setProfileData] = useState<ProfileWithMetadata | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [isInLibrary, setIsInLibrary] = useState(inLibrary ?? true);

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

  const handlePublish = async () => {
    // Fetch full profile data
    const profile = await window.electronAPI.getProfile(id);
    if (profile) {
      setProfileData(profile as ProfileWithMetadata);
      setShowPublishDialog(true);
    }
  };

  const handleToggleLibrary = async () => {
    try {
      const newStatus = !isInLibrary;
      await window.electronAPI.toggleProfileInLibrary(id, newStatus);
      setIsInLibrary(newStatus);
    } catch (error) {
      console.error('Failed to toggle library status:', error);
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
        <div>Created: {createdDate}</div>
        {author && !sourceProfileId && (
          <div>Author: @{author}</div>
        )}
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

            {/* Hamburger Menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                title="More actions"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                </svg>
              </button>

              {showMenu && (
                <>
                  {/* Backdrop to close menu */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />

                  {/* Dropdown Menu */}
                  <div className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                    <button
                      onClick={() => {
                        setShowExportDialog(true);
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Export
                    </button>

                    {!isPublic && (
                      <button
                        onClick={() => {
                          handlePublish();
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Publish
                      </button>
                    )}

                    <hr className="my-1 border-gray-200" />

                    <button
                      onClick={() => {
                        if (confirm(`Delete profile "${name}"?`)) {
                          onDelete(id);
                        }
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        ) : hideClone ? (
          <>
            {/* Profile Explorer view: Show Add to Library button */}
            <button
              onClick={handleToggleLibrary}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              {isInLibrary ? 'Remove from Library' : 'Add to Library'}
            </button>

            {/* Hamburger Menu with only Delete */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                title="More actions"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                </svg>
              </button>

              {showMenu && (
                <>
                  {/* Backdrop to close menu */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />

                  {/* Dropdown Menu */}
                  <div className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                    <button
                      onClick={() => {
                        if (confirm(`Delete profile "${name}"?`)) {
                          onDelete(id);
                        }
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Profile Library view: Show Clone to Edit button */}
            <button
              onClick={handleClone}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Clone to Edit
            </button>

            {/* Hamburger Menu for readonly profiles */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                title="More actions"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                </svg>
              </button>

              {showMenu && (
                <>
                  {/* Backdrop to close menu */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />

                  {/* Dropdown Menu */}
                  <div className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                    <button
                      onClick={() => {
                        handleToggleLibrary();
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {isInLibrary ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        )}
                      </svg>
                      {isInLibrary ? 'Remove from Library' : 'Add to Library'}
                    </button>

                    <hr className="my-1 border-gray-200" />

                    <button
                      onClick={() => {
                        if (confirm(`Delete profile "${name}"?`)) {
                          onDelete(id);
                        }
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
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

      {/* Publish Profile Dialog */}
      {showPublishDialog && profileData && (
        <PublishProfileDialog
          profile={profileData}
          onClose={() => {
            setShowPublishDialog(false);
            setProfileData(null);
          }}
        />
      )}
    </div>
  );
}
