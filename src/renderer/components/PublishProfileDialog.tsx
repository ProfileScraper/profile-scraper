import React, { useState, useEffect } from 'react';
import { ProfileWithMetadata } from '../../shared/types';

interface PublishProfileDialogProps {
  profile: ProfileWithMetadata;
  onClose: () => void;
}

export function PublishProfileDialog({ profile, onClose }: PublishProfileDialogProps) {
  const [authStatus, setAuthStatus] = useState<{
    authenticated: boolean;
    user?: { login: string; name: string | null; avatar_url: string } | null;
  }>({ authenticated: false });
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ success: boolean; prUrl?: string; error?: string } | null>(null);

  // Load auth status on mount
  useEffect(() => {
    loadAuthStatus();
  }, []);

  const loadAuthStatus = async () => {
    const status = await window.electronAPI.githubAuthStatus();
    setAuthStatus(status);
  };

  const handleLogin = async () => {
    setIsAuthenticating(true);
    try {
      const result = await window.electronAPI.githubAuthStart();
      if (result.success) {
        await loadAuthStatus();
      } else {
        alert(`Authentication failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Failed to authenticate with GitHub');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handlePublish = async () => {
    // Validation
    if (!description.trim()) {
      alert('Description is required');
      return;
    }

    if (tags.length === 0) {
      alert('At least one tag is required');
      return;
    }

    setIsPublishing(true);
    setPublishResult(null);

    try {
      const result = await window.electronAPI.githubPublishProfile({
        profile,
        description: description.trim(),
        tags,
      });

      setPublishResult(result);

      if (result.success) {
        // Auto-close modal after 3 seconds on success
        setTimeout(() => {
          onClose();
        }, 3000);
      } else {
        alert(`Failed to publish profile: ${result.error}`);
      }
    } catch (error) {
      console.error('Publish error:', error);
      setPublishResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const commonTags = [
    'e-commerce',
    'real-estate',
    'electronics',
    'fashion',
    'books',
    'marketplace',
    'auction',
    'job-board',
  ];

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Publish to Profile Explorer</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={isPublishing}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Success Message */}
          {publishResult?.success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="text-green-800 font-semibold mb-2">✓ Pull Request Created!</h3>
              <p className="text-green-700 text-sm mb-3">
                Your profile has been submitted for review. Once approved, it will be available in Profile Explorer.
              </p>
              <a
                href={publishResult.prUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
              >
                View Pull Request →
              </a>
            </div>
          )}

          {/* Profile Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">Profile: {profile.name}</h3>
            <p className="text-sm text-gray-600">URL: {profile.categoryUrl}</p>
          </div>

          {/* GitHub Auth Section */}
          <div className="mb-6">
            <h3 className="font-semibold mb-2">GitHub Authentication</h3>
            {authStatus.authenticated ? (
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                {authStatus.user?.avatar_url && (
                  <img
                    src={authStatus.user.avatar_url}
                    alt={authStatus.user.login}
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <div>
                  <p className="text-green-800 font-medium">✓ Logged in as @{authStatus.user?.login}</p>
                  {authStatus.user?.name && (
                    <p className="text-green-700 text-sm">{authStatus.user.name}</p>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-600 mb-3">
                  Login with GitHub to publish your profile and auto-populate author information.
                </p>
                <button
                  onClick={handleLogin}
                  disabled={isAuthenticating}
                  className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  {isAuthenticating ? 'Authenticating...' : 'Login with GitHub'}
                </button>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="block font-semibold mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this profile scrapes and any special configuration..."
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
              disabled={!authStatus.authenticated}
            />
            <p className="text-sm text-gray-500 mt-1">
              Explain what sites this profile works with and what data it extracts.
            </p>
          </div>

          {/* Tags */}
          <div className="mb-6">
            <label className="block font-semibold mb-2">
              Tags <span className="text-red-500">*</span> (at least one)
            </label>

            {/* Selected tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm flex items-center gap-2"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-red-200"
                      disabled={!authStatus.authenticated}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Tag input */}
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Enter a tag..."
                className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!authStatus.authenticated}
              />
              <button
                onClick={handleAddTag}
                disabled={!tagInput.trim() || !authStatus.authenticated}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                Add
              </button>
            </div>

            {/* Common tags */}
            <div>
              <p className="text-sm text-gray-600 mb-2">Common tags:</p>
              <div className="flex flex-wrap gap-2">
                {commonTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      if (!tags.includes(tag)) {
                        setTags([...tags, tag]);
                      }
                    }}
                    disabled={tags.includes(tag) || !authStatus.authenticated}
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm hover:bg-gray-300 disabled:opacity-50 transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Auto-populated Fields */}
          {authStatus.authenticated && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold mb-2 text-blue-900">Auto-populated Fields</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>Author:</strong> @{authStatus.user?.login}</li>
                <li>• <strong>Created:</strong> {new Date().toLocaleDateString()}</li>
                <li>• <strong>ID:</strong> Generated automatically</li>
                <li>• <strong>Version:</strong> 1.0.0</li>
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={isPublishing}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePublish}
              disabled={!authStatus.authenticated || !description.trim() || tags.length === 0 || isPublishing || publishResult?.success}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {isPublishing ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Pull Request...
                </>
              ) : publishResult?.success ? (
                '✓ Published'
              ) : (
                'Create Pull Request'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
