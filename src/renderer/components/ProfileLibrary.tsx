import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProfileCard } from './ProfileCard';

interface Profile {
  id: string;
  name: string;
  categoryUrl: string;
  createdAt: number;
}

export function ProfileLibrary() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

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
    // TODO: Implement run with profile ID
    // For now, navigate to jobs page
    navigate('/jobs');
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
      <div className="flex justify-between items-center mb-8">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {profiles.map(profile => (
            <ProfileCard
              key={profile.id}
              {...profile}
              onDelete={handleDelete}
              onRun={handleRun}
            />
          ))}
        </div>
      )}
    </div>
  );
}
