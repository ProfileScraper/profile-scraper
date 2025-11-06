import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProfileCard } from './ProfileCard';

interface Profile {
  id: string;
  name: string;
  categoryUrl: string;
  createdAt: number;
  updatedAt: number;
}

type SortDirection = 'asc' | 'desc' | null;
type SortField = 'name' | 'createdAt' | 'updatedAt' | 'categoryUrl';

export function ProfileLibrary() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const loadProfiles = async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI.getAllProfiles();
      setProfiles(data);
    } catch (error) {
      console.error('Failed to load profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await window.electronAPI.deleteProfile(id);
      await loadProfiles();
    } catch (error) {
      console.error('Failed to delete profile:', error);
    }
  };

  const handleRun = async (id: string) => {
    try {
      await window.electronAPI.startScrape(id);
      // Navigate to jobs page to show progress
      navigate('/jobs');
    } catch (error) {
      console.error('Failed to start scraping:', error);
      // Could add error notification here
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
  };

  // Extract domain from categoryUrl
  const getDomain = (url: string): string => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url;
    }
  };

  // Filter profiles based on search term
  let filteredProfiles = profiles.filter(profile => {
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    const domain = getDomain(profile.categoryUrl).toLowerCase();

    return (
      profile.name.toLowerCase().includes(searchLower) ||
      profile.categoryUrl.toLowerCase().includes(searchLower) ||
      domain.includes(searchLower)
    );
  });

  // Sort profiles
  if (sortField && sortDirection) {
    filteredProfiles = [...filteredProfiles].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      if (sortField === 'name') {
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
      } else if (sortField === 'createdAt') {
        aVal = a.createdAt;
        bVal = b.createdAt;
      } else if (sortField === 'updatedAt') {
        aVal = a.updatedAt;
        bVal = b.updatedAt;
      } else if (sortField === 'categoryUrl') {
        aVal = getDomain(a.categoryUrl).toLowerCase();
        bVal = getDomain(b.categoryUrl).toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });
  }

  const SortButton = ({ field, label }: { field: SortField; label: string }) => {
    const isActive = sortField === field;
    return (
      <button
        onClick={() => handleSort(field)}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-blue-100 text-blue-700'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        {label}
        {isActive && (
          <span className="ml-1">
            {sortDirection === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </button>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading profiles...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Scraping Profiles</h1>
        <button
          onClick={() => navigate('/profiles/new')}
          className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors font-medium"
        >
          + New Profile
        </button>
      </div>

      {profiles.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No profiles yet</h3>
          <p className="text-gray-500 mb-6">Create your first scraping profile to get started</p>
          <button
            onClick={() => navigate('/profiles/new')}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors font-medium"
          >
            Create Profile
          </button>
        </div>
      ) : (
        <>
          {/* Search and Sort Controls */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="space-y-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search profiles
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, domain, or URL..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Sort Buttons */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort by
                </label>
                <div className="flex flex-wrap gap-2">
                  <SortButton field="name" label="Title" />
                  <SortButton field="categoryUrl" label="Domain" />
                  <SortButton field="createdAt" label="Created" />
                  <SortButton field="updatedAt" label="Updated" />
                </div>
              </div>

              {/* Clear Filters */}
              {(searchTerm || sortField) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSortField(null);
                    setSortDirection(null);
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Clear all filters and sorting
                </button>
              )}

              {/* Results Count */}
              {filteredProfiles.length !== profiles.length && (
                <p className="text-sm text-gray-600">
                  Showing {filteredProfiles.length} of {profiles.length} profiles
                </p>
              )}
            </div>
          </div>

          {/* Profiles Grid */}
          {filteredProfiles.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No profiles found</h3>
              <p className="text-gray-500 mb-6">Try adjusting your search or filters</p>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSortField(null);
                  setSortDirection(null);
                }}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProfiles.map(profile => (
                <ProfileCard
                  key={profile.id}
                  {...profile}
                  onDelete={handleDelete}
                  onRun={handleRun}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
