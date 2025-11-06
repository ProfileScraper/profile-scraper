import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProfileStore } from '../store/profileStore';

const TOTAL_STEPS = 5;

export function ProfileBuilder() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const {
    name,
    categoryUrl,
    currentStep,
    setName,
    setCategoryUrl,
    setCurrentStep,
    nextStep,
    previousStep,
    loadProfile,
    reset,
  } = useProfileStore();

  const [localName, setLocalName] = useState(name);
  const [localUrl, setLocalUrl] = useState(categoryUrl);
  const [urlError, setUrlError] = useState('');

  useEffect(() => {
    const initializeForm = async () => {
      if (isEditMode && id) {
        await loadProfile(id);
      } else {
        reset();
        setCurrentStep(0);
      }
    };
    initializeForm();
  }, [id, isEditMode, loadProfile, reset, setCurrentStep]);

  useEffect(() => {
    setLocalName(name);
    setLocalUrl(categoryUrl);
  }, [name, categoryUrl]);

  const validateUrl = (url: string): boolean => {
    if (!url.trim()) {
      setUrlError('Target URL is required');
      return false;
    }

    try {
      new URL(url);
      setUrlError('');
      return true;
    } catch {
      setUrlError('Please enter a valid URL');
      return false;
    }
  };

  const handleNext = () => {
    if (!localName.trim()) {
      alert('Profile name is required');
      return;
    }

    if (!validateUrl(localUrl)) {
      return;
    }

    setName(localName);
    setCategoryUrl(localUrl);
    nextStep();
  };

  const handleLoadInspector = () => {
    if (!validateUrl(localUrl)) {
      return;
    }
    // Placeholder for inspector functionality
    console.log('Load page in inspector:', localUrl);
    alert('Inspector functionality will be implemented in a future step');
  };

  const handleBack = () => {
    navigate('/profiles');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={handleBack}
            className="text-blue-500 hover:text-blue-600 mb-4 flex items-center gap-2"
          >
            <span>&larr;</span> Back to Profiles
          </button>
          <h1 className="text-3xl font-bold text-gray-800">
            {isEditMode ? 'Edit Profile' : 'Create New Profile'}
          </h1>
        </div>

        {/* Step Indicator */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <React.Fragment key={i}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                      i === currentStep
                        ? 'bg-blue-500 text-white'
                        : i < currentStep
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {i < currentStep ? '✓' : i + 1}
                  </div>
                  <span className="text-xs mt-2 text-gray-600">
                    {i === 0 && 'Basic Info'}
                    {i === 1 && 'Selectors'}
                    {i === 2 && 'Workflow'}
                    {i === 3 && 'Pagination'}
                    {i === 4 && 'Settings'}
                  </span>
                </div>
                {i < TOTAL_STEPS - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      i < currentStep ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="text-center text-sm text-gray-600">
            Step {currentStep + 1} of {TOTAL_STEPS}
          </div>
        </div>

        {/* Step 1: Basic Info */}
        {currentStep === 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6 text-gray-800">Basic Information</h2>

            <div className="space-y-6">
              {/* Profile Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profile Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={localName}
                  onChange={(e) => setLocalName(e.target.value)}
                  placeholder="e.g., Amazon Electronics Scraper"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  A descriptive name to identify this scraping profile
                </p>
              </div>

              {/* Target URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target URL <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={localUrl}
                  onChange={(e) => {
                    setLocalUrl(e.target.value);
                    if (urlError) validateUrl(e.target.value);
                  }}
                  onBlur={() => localUrl && validateUrl(localUrl)}
                  placeholder="https://example.com/category"
                  className={`w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    urlError ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {urlError && <p className="text-xs text-red-500 mt-1">{urlError}</p>}
                <p className="text-xs text-gray-500 mt-1">
                  The category or listing page URL where products are displayed
                </p>
              </div>

              {/* Load Inspector Button */}
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={handleLoadInspector}
                  disabled={!localUrl}
                  className="w-full bg-gray-100 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Load Page in Inspector
                </button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Open the visual inspector to help configure selectors in the next steps
                </p>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={handleBack}
                className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                Next: Configure Selectors
              </button>
            </div>
          </div>
        )}

        {/* Placeholder for other steps */}
        {currentStep > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6 text-gray-800">
              Step {currentStep + 1}: Coming Soon
            </h2>
            <p className="text-gray-600 mb-6">
              This step will be implemented in future updates.
            </p>
            <div className="flex justify-between">
              <button
                onClick={previousStep}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Back
              </button>
              {currentStep < TOTAL_STEPS - 1 && (
                <button
                  onClick={nextStep}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                >
                  Next
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
