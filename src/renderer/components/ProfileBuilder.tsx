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
    productLinkSelector,
    fieldSelectors,
    paginationSelector,
    currentStep,
    setName,
    setCategoryUrl,
    setProductLinkSelector,
    addFieldSelector,
    removeFieldSelector,
    setPagination,
    setCurrentStep,
    nextStep,
    previousStep,
    loadProfile,
    reset,
  } = useProfileStore();

  const [localName, setLocalName] = useState(name);
  const [localUrl, setLocalUrl] = useState(categoryUrl);
  const [urlError, setUrlError] = useState('');

  // Step 2: Selector configuration
  const [localProductLinkSelector, setLocalProductLinkSelector] = useState(productLinkSelector);
  const [localPaginationSelector, setLocalPaginationSelector] = useState(paginationSelector);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldSelector, setNewFieldSelector] = useState('');

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
    setLocalProductLinkSelector(productLinkSelector);
    setLocalPaginationSelector(paginationSelector);
  }, [name, categoryUrl, productLinkSelector, paginationSelector]);

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

  // Step 2 handlers
  const handleAddField = () => {
    if (!newFieldName.trim() || !newFieldSelector.trim()) {
      alert('Both field name and selector are required');
      return;
    }

    if (fieldSelectors[newFieldName]) {
      alert('A field with this name already exists');
      return;
    }

    addFieldSelector(newFieldName.trim(), newFieldSelector.trim());
    setNewFieldName('');
    setNewFieldSelector('');
  };

  const handleRemoveField = (fieldName: string) => {
    removeFieldSelector(fieldName);
  };

  const handleStep2Next = () => {
    if (!localProductLinkSelector.trim()) {
      alert('Product link selector is required');
      return;
    }

    if (Object.keys(fieldSelectors).length === 0) {
      alert('At least one field selector is required');
      return;
    }

    setProductLinkSelector(localProductLinkSelector);

    // Update pagination if set
    if (localPaginationSelector.trim()) {
      setPagination('button', localPaginationSelector, 10);
    }

    nextStep();
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

        {/* Step 2: Configure Selectors */}
        {currentStep === 1 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6 text-gray-800">Configure Selectors</h2>

            <div className="space-y-6">
              {/* Inspector Mode Notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">Manual Selector Entry</h3>
                <p className="text-sm text-blue-800 mb-2">
                  Enter CSS selectors manually for each field. Use browser DevTools to inspect elements and copy their selectors.
                </p>
                <p className="text-xs text-blue-600 italic">
                  Advanced: Inspector mode coming soon - manually enter CSS selectors for now
                </p>
              </div>

              {/* Product Link Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Link Selector <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={localProductLinkSelector}
                  onChange={(e) => setLocalProductLinkSelector(e.target.value)}
                  placeholder="e.g., a.product-link, .product-card > a"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  CSS selector for the links to individual product pages
                </p>
              </div>

              {/* Field Selectors */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Field Selectors <span className="text-red-500">*</span>
                </label>

                {/* Existing field selectors */}
                {Object.keys(fieldSelectors).length > 0 && (
                  <div className="space-y-2 mb-4">
                    {Object.entries(fieldSelectors).map(([fieldName, selector]) => (
                      <div
                        key={fieldName}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex-1 grid grid-cols-2 gap-3">
                          <div>
                            <span className="text-xs text-gray-500">Field Name:</span>
                            <p className="font-medium text-gray-800">{fieldName}</p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500">Selector:</span>
                            <p className="font-mono text-sm text-gray-800 truncate">{selector}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveField(fieldName)}
                          className="px-3 py-1 text-red-600 hover:bg-red-50 rounded transition-colors text-sm"
                          title="Remove field"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new field selector */}
                <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Add New Field</h4>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={newFieldName}
                      onChange={(e) => setNewFieldName(e.target.value)}
                      placeholder="Field name (e.g., title, price, rating)"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                    <input
                      type="text"
                      value={newFieldSelector}
                      onChange={(e) => setNewFieldSelector(e.target.value)}
                      placeholder="CSS selector (e.g., .product-title, span.price)"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    />
                    <button
                      onClick={handleAddField}
                      className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm"
                    >
                      Add Field
                    </button>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mt-2">
                  Add mappings from field names to CSS selectors for data extraction
                </p>
              </div>

              {/* Pagination Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pagination Selector <span className="text-gray-400">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={localPaginationSelector}
                  onChange={(e) => setLocalPaginationSelector(e.target.value)}
                  placeholder="e.g., button.next-page, a.pagination-next"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  CSS selector for the "Next Page" button or link (leave empty if not applicable)
                </p>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={previousStep}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Back
              </button>
              <button
                onClick={handleStep2Next}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                Next: Configure Workflow
              </button>
            </div>
          </div>
        )}

        {/* Placeholder for steps 3-5 */}
        {currentStep > 1 && (
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
