import React from 'react';
import { useNavigate } from 'react-router-dom';

interface ProfileCardProps {
  id: string;
  name: string;
  categoryUrl: string;
  createdAt: number;
  onDelete: (id: string) => void;
  onRun: (id: string) => void;
}

export function ProfileCard({ id, name, categoryUrl, createdAt, onDelete, onRun }: ProfileCardProps) {
  const navigate = useNavigate();
  const createdDate = new Date(createdAt).toLocaleDateString();

  return (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">{name}</h3>
          <p className="text-sm text-gray-500 mt-1">{categoryUrl}</p>
        </div>
      </div>

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
        <button
          onClick={() => navigate(`/profiles/${id}/edit`)}
          className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 transition-colors text-sm font-medium"
        >
          Edit
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
      </div>
    </div>
  );
}
