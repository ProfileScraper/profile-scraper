import React from 'react';

interface Props {
  profileName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ExportWarningDialog({ profileName, onConfirm, onCancel }: Props) {
  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-semibold mb-4">Export Profile</h2>

        <p className="mb-4">
          You are about to export <strong>{profileName}</strong>.
        </p>

        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
          <p className="text-sm text-yellow-800">
            Warning: This export may contain site-specific selectors.
            Review before sharing publicly.
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 border rounded hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Download JSON
          </button>
        </div>
      </div>
    </div>
  );
}
