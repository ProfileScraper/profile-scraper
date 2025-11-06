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
    fieldSelectors,
    paginationSelector,
    preActions,
    productPageActions,
    currentStep,
    setName,
    setCategoryUrl,
    setProductLinkSelector,
    addFieldSelector,
    removeFieldSelector,
    setPagination,
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

  // Step 3: Workflow configuration
  const [editingAction, setEditingAction] = useState<{ type: 'pre' | 'product', index: number } | null>(null);
  const [showActionForm, setShowActionForm] = useState<{ type: 'pre' | 'product', actionType: Action['type'] } | null>(null);
  const [actionFormData, setActionFormData] = useState<Partial<Action>>({});

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

        {/* Placeholder for steps 4-5 */}
        {currentStep > 2 && (
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
