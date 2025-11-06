import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { useProfileStore } from '../store/profileStore';
import { Action } from '../../shared/types';

const TOTAL_STEPS = 5;

export function ProfileBuilder() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const {
    name,
    categoryUrl,
    productLinkSelector,
    prependDomain,
    fieldSelectors,
    paginationSelector,
    paginationType,
    maxPages,
    concurrency,
    delayRange,
    retries,
    checkpointInterval,
    preActions,
    productPageActions,
    currentStep,
    isSaving,
    setName,
    setCategoryUrl,
    setProductLinkSelector,
    setPrependDomain,
    addFieldSelector,
    removeFieldSelector,
    setPagination,
    setOrchestratorSettings,
    addPreAction,
    removePreAction,
    updatePreAction,
    reorderPreActions,
    addProductPageAction,
    removeProductPageAction,
    updateProductPageAction,
    reorderProductPageActions,
    setCurrentStep,
    nextStep,
    previousStep,
    loadProfile,
    saveProfile,
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
  const [newFieldAttribute, setNewFieldAttribute] = useState<string>('');

  // Step 3: Workflow configuration
  const [editingAction, setEditingAction] = useState<{ type: 'pre' | 'product', index: number } | null>(null);
  const [showActionForm, setShowActionForm] = useState<{ type: 'pre' | 'product', actionType: Action['type'] } | null>(null);
  const [actionFormData, setActionFormData] = useState<Partial<Action>>({});

  // Step 4: Orchestrator configuration
  const [localPaginationType, setLocalPaginationType] = useState<'button' | 'infinite' | 'url'>(paginationType);
  const [localMaxPages, setLocalMaxPages] = useState(maxPages);
  const [localConcurrency, setLocalConcurrency] = useState(concurrency);
  const [localDelayMin, setLocalDelayMin] = useState(delayRange[0]);
  const [localDelayMax, setLocalDelayMax] = useState(delayRange[1]);
  const [localRetries, setLocalRetries] = useState(retries);
  const [localCheckpointInterval, setLocalCheckpointInterval] = useState(checkpointInterval);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

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
    setLocalPaginationType(paginationType);
    setLocalMaxPages(maxPages);
    setLocalConcurrency(concurrency);
    setLocalDelayMin(delayRange[0]);
    setLocalDelayMax(delayRange[1]);
    setLocalRetries(retries);
    setLocalCheckpointInterval(checkpointInterval);
  }, [name, categoryUrl, productLinkSelector, paginationSelector, paginationType, maxPages, concurrency, delayRange, retries, checkpointInterval]);

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

  // Helper function to suggest attribute based on selector
  const suggestAttribute = (selector: string): string => {
    const lowerSelector = selector.toLowerCase();

    // Check if selector targets 'a' elements -> suggest 'href'
    if (lowerSelector === 'a' || lowerSelector.startsWith('a.') || lowerSelector.startsWith('a#') ||
        lowerSelector.startsWith('a[') || lowerSelector.includes(' a') || lowerSelector.endsWith(' a')) {
      return 'href';
    }

    // Check for img elements -> suggest 'src'
    if (lowerSelector === 'img' || lowerSelector.startsWith('img.') || lowerSelector.startsWith('img#') ||
        lowerSelector.startsWith('img[') || lowerSelector.includes(' img') || lowerSelector.endsWith(' img')) {
      return 'src';
    }

    // Check for input elements -> suggest 'value'
    if (lowerSelector === 'input' || lowerSelector.startsWith('input.') || lowerSelector.startsWith('input#') ||
        lowerSelector.startsWith('input[') || lowerSelector.includes(' input') || lowerSelector.endsWith(' input')) {
      return 'value';
    }

    // Default to text content (empty string means textContent)
    return '';
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

    const attribute = newFieldAttribute || undefined;
    const fieldValue = attribute ? { selector: newFieldSelector.trim(), attribute } : newFieldSelector.trim();

    addFieldSelector(newFieldName.trim(), fieldValue);
    setNewFieldName('');
    setNewFieldSelector('');
    setNewFieldAttribute('');
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

  // Step 3 handlers
  const handleAddAction = (sectionType: 'pre' | 'product', actionType: Action['type']) => {
    setShowActionForm({ type: sectionType, actionType });
    setActionFormData({ type: actionType, optional: false });
  };

  const handleSaveAction = () => {
    if (!showActionForm) return;

    const action = actionFormData as Action;

    // Validate action
    if ((action.type === 'clickElement' || action.type === 'waitForSelector' || action.type === 'type') && !action.selector?.trim()) {
      alert('Selector is required for this action');
      return;
    }

    if (action.type === 'sleep' && (!action.duration || action.duration <= 0)) {
      alert('Duration is required for sleep action');
      return;
    }

    if (action.type === 'scrollTo' && action.duration === undefined) {
      alert('Position is required for scroll action');
      return;
    }

    if (action.type === 'type' && !action.text?.trim()) {
      alert('Text is required for type action');
      return;
    }

    if (editingAction) {
      // Update existing action
      if (editingAction.type === 'pre') {
        updatePreAction(editingAction.index, action);
      } else {
        updateProductPageAction(editingAction.index, action);
      }
      setEditingAction(null);
    } else {
      // Add new action
      if (showActionForm.type === 'pre') {
        addPreAction(action);
      } else {
        addProductPageAction(action);
      }
    }

    setShowActionForm(null);
    setActionFormData({});
  };

  const handleCancelAction = () => {
    setShowActionForm(null);
    setActionFormData({});
    setEditingAction(null);
  };

  const handleEditAction = (sectionType: 'pre' | 'product', index: number) => {
    const action = sectionType === 'pre' ? preActions[index] : productPageActions[index];
    setEditingAction({ type: sectionType, index });
    setActionFormData(action);
    setShowActionForm({ type: sectionType, actionType: action.type });
  };

  const handleDeleteAction = (sectionType: 'pre' | 'product', index: number) => {
    if (sectionType === 'pre') {
      removePreAction(index);
    } else {
      removeProductPageAction(index);
    }
  };

  const handleDragEnd = (result: DropResult, sectionType: 'pre' | 'product') => {
    if (!result.destination) return;

    const startIndex = result.source.index;
    const endIndex = result.destination.index;

    if (startIndex === endIndex) return;

    if (sectionType === 'pre') {
      reorderPreActions(startIndex, endIndex);
    } else {
      reorderProductPageActions(startIndex, endIndex);
    }
  };

  const getActionLabel = (action: Action): string => {
    switch (action.type) {
      case 'clickElement':
        return `Click: ${action.selector || '(no selector)'}`;
      case 'sleep':
        return `Sleep: ${action.duration}ms`;
      case 'scrollTo':
        return `Scroll to: ${action.duration || 0}px`;
      case 'waitForSelector':
        return `Wait for: ${action.selector || '(no selector)'}`;
      case 'type':
        return `Type: "${action.text}" into ${action.selector || '(no selector)'}`;
      default:
        return action.type;
    }
  };

  const getActionIcon = (actionType: Action['type']): string => {
    switch (actionType) {
      case 'clickElement': return '👆';
      case 'sleep': return '⏱️';
      case 'scrollTo': return '📜';
      case 'waitForSelector': return '⏳';
      case 'type': return '⌨️';
      default: return '•';
    }
  };

  // Step 4 handlers
  const handleStep4Next = () => {
    // Validate pagination settings
    if (localPaginationType === 'button' && !paginationSelector.trim()) {
      alert('Pagination selector is required when using button pagination');
      return;
    }

    // Save pagination settings
    setPagination(localPaginationType, paginationSelector, localMaxPages);

    // Save orchestrator settings
    setOrchestratorSettings({
      concurrency: localConcurrency,
      delayRange: [localDelayMin, localDelayMax],
      retries: localRetries,
      checkpointInterval: localCheckpointInterval,
    });

    nextStep();
  };

  // Step 5 handlers
  const handleSaveProfile = async () => {
    try {
      const profileId = await saveProfile();
      navigate('/profiles');
    } catch (error) {
      console.error('Failed to save profile:', error);
      alert('Failed to save profile. Please try again.');
    }
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
                    {i === 3 && 'Settings'}
                    {i === 4 && 'Review'}
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

                {/* Prepend Domain Checkbox */}
                <label className="flex items-center gap-2 mt-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prependDomain}
                    onChange={(e) => setPrependDomain(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    Prepend domain to relative URLs
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  Enable this if product links are relative (e.g., "/product/123" instead of "https://example.com/product/123")
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
                    {Object.entries(fieldSelectors).map(([fieldName, selectorValue]) => {
                      const isObject = typeof selectorValue === 'object';
                      const selector = isObject ? selectorValue.selector : selectorValue;
                      const attribute = isObject ? selectorValue.attribute : undefined;

                      return (
                        <div
                          key={fieldName}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="flex-1 grid grid-cols-3 gap-3">
                            <div>
                              <span className="text-xs text-gray-500">Field Name:</span>
                              <p className="font-medium text-gray-800">{fieldName}</p>
                            </div>
                            <div>
                              <span className="text-xs text-gray-500">Selector:</span>
                              <p className="font-mono text-sm text-gray-800 truncate">{selector}</p>
                            </div>
                            <div>
                              <span className="text-xs text-gray-500">Extract:</span>
                              <p className="text-sm text-gray-800">{attribute || 'text content'}</p>
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
                      );
                    })}
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
                      onChange={(e) => {
                        const value = e.target.value;
                        setNewFieldSelector(value);
                        // Auto-suggest attribute based on selector
                        if (value.trim()) {
                          const suggested = suggestAttribute(value);
                          setNewFieldAttribute(suggested);
                        }
                      }}
                      placeholder="CSS selector (e.g., .product-title, span.price)"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    />
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Extract from element:
                      </label>
                      <select
                        value={newFieldAttribute}
                        onChange={(e) => setNewFieldAttribute(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      >
                        <option value="">Text content (default)</option>
                        <option value="href">href (for links)</option>
                        <option value="src">src (for images)</option>
                        <option value="value">value (for inputs)</option>
                        <option value="alt">alt (for images)</option>
                        <option value="title">title attribute</option>
                        <option value="data-price">data-price</option>
                        <option value="data-id">data-id</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Auto-suggested based on your selector. Change if needed.
                      </p>
                    </div>
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

        {/* Step 3: Configure Workflow */}
        {currentStep === 2 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6 text-gray-800">Configure Workflow</h2>

            {/* Pre-Actions Section */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-700 mb-3">Pre-Actions</h3>
              <p className="text-sm text-gray-500 mb-4">
                Actions to run once before scraping starts (e.g., login, accept cookies)
              </p>

              {/* Action Toolbar */}
              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  onClick={() => handleAddAction('pre', 'clickElement')}
                  className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                >
                  {getActionIcon('clickElement')} Click Element
                </button>
                <button
                  onClick={() => handleAddAction('pre', 'sleep')}
                  className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                >
                  {getActionIcon('sleep')} Wait/Sleep
                </button>
                <button
                  onClick={() => handleAddAction('pre', 'scrollTo')}
                  className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                >
                  {getActionIcon('scrollTo')} Scroll To
                </button>
                <button
                  onClick={() => handleAddAction('pre', 'waitForSelector')}
                  className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                >
                  {getActionIcon('waitForSelector')} Wait For Selector
                </button>
                <button
                  onClick={() => handleAddAction('pre', 'type')}
                  className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                >
                  {getActionIcon('type')} Type Text
                </button>
              </div>

              {/* Action List */}
              <DragDropContext onDragEnd={(result) => handleDragEnd(result, 'pre')}>
                <Droppable droppableId="pre-actions">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-2 min-h-[50px] border-2 border-dashed border-gray-200 rounded-lg p-2"
                    >
                      {preActions.length === 0 && (
                        <div className="text-center py-6 text-gray-400 text-sm">
                          No pre-actions configured. Add actions using the buttons above.
                        </div>
                      )}
                      {preActions.map((action, index) => (
                        <Draggable key={`pre-${index}`} draggableId={`pre-${index}`} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`flex items-center gap-3 p-3 bg-white border rounded-lg ${
                                snapshot.isDragging ? 'shadow-lg border-blue-300' : 'border-gray-200'
                              }`}
                            >
                              <div className="text-gray-400">☰</div>
                              <div className="flex-1">
                                <div className="font-medium text-gray-800 text-sm">
                                  {getActionIcon(action.type)} {getActionLabel(action)}
                                </div>
                                {action.optional && (
                                  <span className="text-xs text-gray-500 italic">Optional</span>
                                )}
                              </div>
                              <button
                                onClick={() => handleEditAction('pre', index)}
                                className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors text-sm"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteAction('pre', index)}
                                className="px-3 py-1 text-red-600 hover:bg-red-50 rounded transition-colors text-sm"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>

            {/* Product Page Actions Section */}
            <div className="mb-8">
              <h3 className="text-lg font-medium text-gray-700 mb-3">Product Page Actions</h3>
              <p className="text-sm text-gray-500 mb-4">
                Actions to run on each product page (e.g., expand details, click tabs)
              </p>

              {/* Action Toolbar */}
              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  onClick={() => handleAddAction('product', 'clickElement')}
                  className="px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                >
                  {getActionIcon('clickElement')} Click Element
                </button>
                <button
                  onClick={() => handleAddAction('product', 'sleep')}
                  className="px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                >
                  {getActionIcon('sleep')} Wait/Sleep
                </button>
                <button
                  onClick={() => handleAddAction('product', 'scrollTo')}
                  className="px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                >
                  {getActionIcon('scrollTo')} Scroll To
                </button>
                <button
                  onClick={() => handleAddAction('product', 'waitForSelector')}
                  className="px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                >
                  {getActionIcon('waitForSelector')} Wait For Selector
                </button>
                <button
                  onClick={() => handleAddAction('product', 'type')}
                  className="px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                >
                  {getActionIcon('type')} Type Text
                </button>
              </div>

              {/* Action List */}
              <DragDropContext onDragEnd={(result) => handleDragEnd(result, 'product')}>
                <Droppable droppableId="product-actions">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-2 min-h-[50px] border-2 border-dashed border-gray-200 rounded-lg p-2"
                    >
                      {productPageActions.length === 0 && (
                        <div className="text-center py-6 text-gray-400 text-sm">
                          No product page actions configured. Add actions using the buttons above.
                        </div>
                      )}
                      {productPageActions.map((action, index) => (
                        <Draggable key={`product-${index}`} draggableId={`product-${index}`} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`flex items-center gap-3 p-3 bg-white border rounded-lg ${
                                snapshot.isDragging ? 'shadow-lg border-green-300' : 'border-gray-200'
                              }`}
                            >
                              <div className="text-gray-400">☰</div>
                              <div className="flex-1">
                                <div className="font-medium text-gray-800 text-sm">
                                  {getActionIcon(action.type)} {getActionLabel(action)}
                                </div>
                                {action.optional && (
                                  <span className="text-xs text-gray-500 italic">Optional</span>
                                )}
                              </div>
                              <button
                                onClick={() => handleEditAction('product', index)}
                                className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors text-sm"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteAction('product', index)}
                                className="px-3 py-1 text-red-600 hover:bg-red-50 rounded transition-colors text-sm"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>

            {/* Action Configuration Form */}
            {showActionForm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">
                    {editingAction ? 'Edit' : 'Add'} {showActionForm.actionType === 'clickElement' ? 'Click Element' :
                    showActionForm.actionType === 'sleep' ? 'Wait/Sleep' :
                    showActionForm.actionType === 'scrollTo' ? 'Scroll To' :
                    showActionForm.actionType === 'waitForSelector' ? 'Wait For Selector' :
                    'Type Text'} Action
                  </h3>

                  <div className="space-y-4">
                    {/* Selector input for click, wait, and type */}
                    {(showActionForm.actionType === 'clickElement' ||
                      showActionForm.actionType === 'waitForSelector' ||
                      showActionForm.actionType === 'type') && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          CSS Selector <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={actionFormData.selector || ''}
                          onChange={(e) => setActionFormData({ ...actionFormData, selector: e.target.value })}
                          placeholder="e.g., button.accept-cookies"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                        />
                      </div>
                    )}

                    {/* Duration input for sleep */}
                    {showActionForm.actionType === 'sleep' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Duration (milliseconds) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={actionFormData.duration || ''}
                          onChange={(e) => setActionFormData({ ...actionFormData, duration: parseInt(e.target.value) || 0 })}
                          placeholder="e.g., 2000"
                          min="0"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    )}

                    {/* Position input for scroll */}
                    {showActionForm.actionType === 'scrollTo' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Scroll Position (pixels) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={actionFormData.duration !== undefined ? actionFormData.duration : ''}
                          onChange={(e) => setActionFormData({ ...actionFormData, duration: parseInt(e.target.value) || 0 })}
                          placeholder="e.g., 500"
                          min="0"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Use 0 to scroll to top, or a pixel value to scroll down
                        </p>
                      </div>
                    )}

                    {/* Text input for type action */}
                    {showActionForm.actionType === 'type' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Text to Type <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={actionFormData.text || ''}
                          onChange={(e) => setActionFormData({ ...actionFormData, text: e.target.value })}
                          placeholder="e.g., search query"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    )}

                    {/* Timeout for waitForSelector */}
                    {showActionForm.actionType === 'waitForSelector' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Timeout (milliseconds) <span className="text-gray-400">(Optional)</span>
                        </label>
                        <input
                          type="number"
                          value={actionFormData.timeout || ''}
                          onChange={(e) => setActionFormData({ ...actionFormData, timeout: parseInt(e.target.value) || undefined })}
                          placeholder="e.g., 5000"
                          min="0"
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    )}

                    {/* Optional checkbox */}
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="optional"
                        checked={actionFormData.optional || false}
                        onChange={(e) => setActionFormData({ ...actionFormData, optional: e.target.checked })}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="optional" className="ml-2 text-sm text-gray-700">
                        Optional (fail gracefully if this action fails)
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      onClick={handleCancelAction}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveAction}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                    >
                      {editingAction ? 'Update' : 'Add'} Action
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={previousStep}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Back
              </button>
              <button
                onClick={nextStep}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                Next: Configure Settings
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Orchestrator Config */}
        {currentStep === 3 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6 text-gray-800">Orchestrator Configuration</h2>

            <div className="space-y-6">
              {/* Pagination Configuration */}
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <h3 className="text-lg font-medium text-gray-700 mb-4">Pagination Settings</h3>

                <div className="space-y-4">
                  {/* Pagination Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pagination Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={localPaginationType}
                      onChange={(e) => setLocalPaginationType(e.target.value as 'button' | 'infinite' | 'url')}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="button">Button (Click Next Button)</option>
                      <option value="infinite">Infinite Scroll</option>
                      <option value="url">URL Pattern</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {localPaginationType === 'button' && 'Clicks a "Next" button to navigate pages'}
                      {localPaginationType === 'infinite' && 'Scrolls down to load more items dynamically'}
                      {localPaginationType === 'url' && 'Follows URL pattern with page numbers'}
                    </p>
                  </div>

                  {/* Pagination Selector (for button type) */}
                  {localPaginationType === 'button' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Next Button Selector <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={paginationSelector}
                        disabled
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-gray-100 font-mono text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Configured in Step 2: {paginationSelector || 'Not set'}
                      </p>
                    </div>
                  )}

                  {/* Max Pages */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Pages <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={localMaxPages}
                      onChange={(e) => setLocalMaxPages(Math.max(1, parseInt(e.target.value) || 1))}
                      min="1"
                      max="1000"
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum number of pages to scrape (1-1000)
                    </p>
                  </div>
                </div>
              </div>

              {/* Smart Defaults Display */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">Smart Defaults Active</h3>
                <p className="text-sm text-blue-800 mb-3">
                  The following settings are optimized for reliable scraping. Expand Advanced Settings to customize.
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-blue-600 font-medium">Concurrency:</span>
                    <span className="ml-2 text-blue-900">{localConcurrency} workers</span>
                  </div>
                  <div>
                    <span className="text-blue-600 font-medium">Retries:</span>
                    <span className="ml-2 text-blue-900">{localRetries} attempts</span>
                  </div>
                  <div>
                    <span className="text-blue-600 font-medium">Delay Range:</span>
                    <span className="ml-2 text-blue-900">{localDelayMin}-{localDelayMax}ms</span>
                  </div>
                  <div>
                    <span className="text-blue-600 font-medium">Checkpoint:</span>
                    <span className="ml-2 text-blue-900">Every {localCheckpointInterval} items</span>
                  </div>
                </div>
              </div>

              {/* Advanced Settings */}
              <div className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-medium text-gray-700">Advanced Settings</span>
                  <span className="text-gray-500">{showAdvancedSettings ? '▼' : '▶'}</span>
                </button>

                {showAdvancedSettings && (
                  <div className="border-t border-gray-200 p-4 space-y-4">
                    {/* Concurrency */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Concurrency (Workers)
                      </label>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          value={localConcurrency}
                          onChange={(e) => setLocalConcurrency(parseInt(e.target.value))}
                          min="1"
                          max="10"
                          className="flex-1"
                        />
                        <span className="text-gray-700 font-medium w-12 text-center">{localConcurrency}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Number of concurrent workers (1-10). Higher = faster but more resource-intensive.
                      </p>
                    </div>

                    {/* Delay Range */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Delay Range (milliseconds)
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-600">Minimum</label>
                          <input
                            type="number"
                            value={localDelayMin}
                            onChange={(e) => setLocalDelayMin(Math.max(0, parseInt(e.target.value) || 0))}
                            min="0"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-600">Maximum</label>
                          <input
                            type="number"
                            value={localDelayMax}
                            onChange={(e) => setLocalDelayMax(Math.max(localDelayMin, parseInt(e.target.value) || 0))}
                            min={localDelayMin}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Random delay between requests to avoid detection
                      </p>
                    </div>

                    {/* Retries */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Retries
                      </label>
                      <input
                        type="number"
                        value={localRetries}
                        onChange={(e) => setLocalRetries(Math.max(0, Math.min(10, parseInt(e.target.value) || 0)))}
                        min="0"
                        max="10"
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Number of retry attempts for failed requests (0-10)
                      </p>
                    </div>

                    {/* Checkpoint Interval */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Checkpoint Interval
                      </label>
                      <input
                        type="number"
                        value={localCheckpointInterval}
                        onChange={(e) => setLocalCheckpointInterval(Math.max(1, parseInt(e.target.value) || 1))}
                        min="1"
                        className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Save progress every N items to enable resume on failure
                      </p>
                    </div>
                  </div>
                )}
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
                onClick={handleStep4Next}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                Next: Review & Save
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Review & Save */}
        {currentStep === 4 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-6 text-gray-800">Review & Save Profile</h2>

            {/* Summary Card */}
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="text-blue-500">1.</span> Basic Information
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex">
                    <span className="w-32 text-gray-600">Profile Name:</span>
                    <span className="text-gray-800 font-medium">{name}</span>
                  </div>
                  <div className="flex">
                    <span className="w-32 text-gray-600">Target URL:</span>
                    <span className="text-gray-800 font-mono text-xs break-all">{categoryUrl}</span>
                  </div>
                </div>
              </div>

              {/* Selectors */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="text-blue-500">2.</span> Selectors
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-gray-600">Product Link:</span>
                    <div className="mt-1 font-mono text-xs bg-gray-50 p-2 rounded border border-gray-200">
                      {productLinkSelector}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Field Selectors ({Object.keys(fieldSelectors).length}):</span>
                    <div className="mt-2 space-y-1">
                      {Object.entries(fieldSelectors).map(([field, selectorValue]) => {
                        const isObject = typeof selectorValue === 'object';
                        const selector = isObject ? selectorValue.selector : selectorValue;
                        const attribute = isObject ? selectorValue.attribute : undefined;
                        return (
                          <div key={field} className="flex items-start gap-2 text-xs">
                            <span className="font-medium text-gray-700 min-w-[80px]">{field}:</span>
                            <span className="font-mono text-gray-600 break-all">
                              {selector}
                              {attribute && <span className="text-blue-600 ml-1">→ {attribute}</span>}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Workflow */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="text-blue-500">3.</span> Workflow
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-gray-600">Pre-Actions ({preActions.length}):</span>
                    {preActions.length > 0 ? (
                      <ul className="mt-2 space-y-1 list-disc list-inside">
                        {preActions.map((action, idx) => (
                          <li key={idx} className="text-xs text-gray-700">
                            {getActionLabel(action)}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-gray-500 italic mt-1">None configured</p>
                    )}
                  </div>
                  <div>
                    <span className="text-gray-600">Product Page Actions ({productPageActions.length}):</span>
                    {productPageActions.length > 0 ? (
                      <ul className="mt-2 space-y-1 list-disc list-inside">
                        {productPageActions.map((action, idx) => (
                          <li key={idx} className="text-xs text-gray-700">
                            {getActionLabel(action)}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-gray-500 italic mt-1">None configured</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Configuration */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="text-blue-500">4.</span> Configuration
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-gray-600 font-medium">Pagination:</span>
                    <div className="mt-1 space-y-1 ml-4">
                      <div className="flex">
                        <span className="w-24 text-gray-600">Type:</span>
                        <span className="text-gray-800 capitalize">{paginationType}</span>
                      </div>
                      {paginationType === 'button' && paginationSelector && (
                        <div className="flex">
                          <span className="w-24 text-gray-600">Selector:</span>
                          <span className="text-gray-800 font-mono text-xs">{paginationSelector}</span>
                        </div>
                      )}
                      <div className="flex">
                        <span className="w-24 text-gray-600">Max Pages:</span>
                        <span className="text-gray-800">{maxPages}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600 font-medium">Orchestrator:</span>
                    <div className="mt-1 space-y-1 ml-4">
                      <div className="flex">
                        <span className="w-32 text-gray-600">Concurrency:</span>
                        <span className="text-gray-800">{concurrency} workers</span>
                      </div>
                      <div className="flex">
                        <span className="w-32 text-gray-600">Delay Range:</span>
                        <span className="text-gray-800">{delayRange[0]}-{delayRange[1]}ms</span>
                      </div>
                      <div className="flex">
                        <span className="w-32 text-gray-600">Retries:</span>
                        <span className="text-gray-800">{retries} attempts</span>
                      </div>
                      <div className="flex">
                        <span className="w-32 text-gray-600">Checkpoint:</span>
                        <span className="text-gray-800">Every {checkpointInterval} items</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={previousStep}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Back
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => navigate('/profiles')}
                  className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Saving...' : isEditMode ? 'Update Profile' : 'Save Profile'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
