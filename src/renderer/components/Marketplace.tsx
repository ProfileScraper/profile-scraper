import React, { useState, useEffect } from 'react';
import { ProfileWithMetadata } from '../../shared/types';
import { getDomain } from '../utils/profileGrouping';
import { ProfileCard } from './ProfileCard';

export function Marketplace() {
  const [profiles, setProfiles] = useState<ProfileWithMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadPublicProfiles();
  }, []);

  const loadPublicProfiles = async () => {
    setLoading(true);
    try {
      const publicProfiles = await window.electronAPI.getPublicProfiles();
      setProfiles(publicProfiles as ProfileWithMetadata[]);
    } catch (error) {
      console.error('Failed to load public profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await window.electronAPI.syncMarketplace();
      if (result.success) {
        await loadPublicProfiles();
        console.log(`Synced: +${result.profilesAdded} new, ${result.profilesUpdated} updated`);
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  // Filter profiles
  const filteredProfiles = profiles.filter(profile => {
    // Search filter
    const matchesSearch = !searchTerm ||
      profile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getDomain(profile.categoryUrl).toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.author?.toLowerCase().includes(searchTerm.toLowerCase());

    // Tag filter
    const matchesTags = selectedTags.size === 0 ||
      (profile.tags && profile.tags.some(tag => selectedTags.has(tag)));

    return matchesSearch && matchesTags;
  });

  // Get all unique tags
  const allTags = Array.from(new Set(
    profiles.flatMap(p => p.tags || [])
  )).sort();

  const toggleTag = (tag: string) => {
    const newTags = new Set(selectedTags);
    if (newTags.has(tag)) {
      newTags.delete(tag);
    } else {
      newTags.add(tag);
    }
    setSelectedTags(newTags);
  };

  const handleRun = async (id: string) => {
    const profile = profiles.find(p => p.id === id);
    if (!profile) return;

    try {
      await window.electronAPI.startScrape(profile.name);
    } catch (error) {
      console.error('Failed to start scrape:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await window.electronAPI.deleteProfile(id);
      await loadPublicProfiles();
    } catch (error) {
      console.error('Failed to delete profile:', error);
    }
  };

  if (loading) {
    return <div className="p-8">Loading marketplace...</div>;
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Profile Marketplace</h1>

        <button
          onClick={handleSync}
          disabled={syncing}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {syncing ? 'Syncing...' : 'Refresh'}
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name, domain, or author..."
          className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Tag filters */}
      {allTags.length > 0 && (
        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-2">Filter by tags:</p>
          <div className="flex flex-wrap gap-2">
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  selectedTags.has(tag)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results count */}
      <p className="text-sm text-gray-600 mb-4">
        Showing {filteredProfiles.length} of {profiles.length} profiles
      </p>

      {/* Profile grid */}
      {filteredProfiles.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No public profiles available.</p>
          <button onClick={handleSync} className="mt-4 text-blue-600 underline">
            Sync with repository
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProfiles.map(profile => (
            <ProfileCard
              key={profile.id}
              id={profile.id}
              name={profile.name}
              categoryUrl={profile.categoryUrl}
              createdAt={profile.created_at}
              isReadonly={profile.isReadonly}
              isPublic={profile.isPublic}
              sourceProfileId={profile.sourceProfileId}
              author={profile.author}
              description={profile.description}
              onDelete={handleDelete}
              onRun={handleRun}
            />
          ))}
        </div>
      )}
    </div>
  );
}
