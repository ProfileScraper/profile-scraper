import { create } from 'zustand';
import { SiteProfile, Action, FieldSelector } from '../../shared/types';

interface ProfileFormState {
  // Basic info
  name: string;
  categoryUrl: string;

  // Selectors
  productLinkSelector: string;
  prependDomain: boolean;
  fieldSelectors: Record<string, string | FieldSelector>;

  // Actions
  preActions: Action[];
  productPageActions: Action[];

  // Pagination
  paginationType: 'button' | 'infinite' | 'url';
  paginationSelector: string;
  maxPages: number;

  // Orchestrator settings
  concurrency: number;
  delayRange: [number, number];
  retries: number;
  checkpointInterval: number;

  // UI state
  currentStep: number;
  isInspectorActive: boolean;
  isSaving: boolean;
  editingProfileId: string | null;
}

interface ProfileStoreActions {
  // Form updates
  setName: (name: string) => void;
  setCategoryUrl: (url: string) => void;
  setProductLinkSelector: (selector: string) => void;
  setPrependDomain: (prepend: boolean) => void;
  addFieldSelector: (field: string, selector: string | FieldSelector) => void;
  removeFieldSelector: (field: string) => void;
  addPreAction: (action: Action) => void;
  removePreAction: (index: number) => void;
  updatePreAction: (index: number, action: Action) => void;
  reorderPreActions: (startIndex: number, endIndex: number) => void;
  addProductPageAction: (action: Action) => void;
  removeProductPageAction: (index: number) => void;
  updateProductPageAction: (index: number, action: Action) => void;
  reorderProductPageActions: (startIndex: number, endIndex: number) => void;
  setPagination: (type: 'button' | 'infinite' | 'url', selector: string, maxPages: number) => void;
  setOrchestratorSettings: (settings: { concurrency?: number; delayRange?: [number, number]; retries?: number; checkpointInterval?: number }) => void;

  // Navigation
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;

  // Inspector
  setInspectorActive: (active: boolean) => void;

  // Persistence
  loadProfile: (id: string) => Promise<void>;
  saveProfile: () => Promise<string>;
  reset: () => void;
}

type ProfileStore = ProfileFormState & ProfileStoreActions;

const initialState: ProfileFormState = {
  name: '',
  categoryUrl: '',
  productLinkSelector: '',
  prependDomain: false,
  fieldSelectors: {},
  preActions: [],
  productPageActions: [],
  paginationType: 'button',
  paginationSelector: '',
  maxPages: 10,
  concurrency: 3,
  delayRange: [2000, 4000],
  retries: 3,
  checkpointInterval: 10,
  currentStep: 0,
  isInspectorActive: false,
  isSaving: false,
  editingProfileId: null,
};

export const useProfileStore = create<ProfileStore>((set, get) => ({
  ...initialState,

  setName: (name) => set({ name }),
  setCategoryUrl: (url) => set({ categoryUrl: url }),
  setProductLinkSelector: (selector) => set({ productLinkSelector: selector }),
  setPrependDomain: (prepend) => set({ prependDomain: prepend }),

  addFieldSelector: (field, selector) => set((state) => ({
    fieldSelectors: { ...state.fieldSelectors, [field]: selector }
  })),

  removeFieldSelector: (field) => set((state) => {
    const { [field]: removed, ...rest } = state.fieldSelectors;
    return { fieldSelectors: rest };
  }),

  addPreAction: (action) => set((state) => ({
    preActions: [...state.preActions, action]
  })),

  removePreAction: (index) => set((state) => ({
    preActions: state.preActions.filter((_, i) => i !== index)
  })),

  updatePreAction: (index, action) => set((state) => ({
    preActions: state.preActions.map((a, i) => i === index ? action : a)
  })),

  reorderPreActions: (startIndex, endIndex) => set((state) => {
    const result = Array.from(state.preActions);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return { preActions: result };
  }),

  addProductPageAction: (action) => set((state) => ({
    productPageActions: [...state.productPageActions, action]
  })),

  removeProductPageAction: (index) => set((state) => ({
    productPageActions: state.productPageActions.filter((_, i) => i !== index)
  })),

  updateProductPageAction: (index, action) => set((state) => ({
    productPageActions: state.productPageActions.map((a, i) => i === index ? action : a)
  })),

  reorderProductPageActions: (startIndex, endIndex) => set((state) => {
    const result = Array.from(state.productPageActions);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return { productPageActions: result };
  }),

  setPagination: (type, selector, maxPages) => set({
    paginationType: type,
    paginationSelector: selector,
    maxPages
  }),

  setOrchestratorSettings: (settings) => set((state) => ({
    concurrency: settings.concurrency ?? state.concurrency,
    delayRange: settings.delayRange ?? state.delayRange,
    retries: settings.retries ?? state.retries,
    checkpointInterval: settings.checkpointInterval ?? state.checkpointInterval,
  })),

  setCurrentStep: (step) => set({ currentStep: step }),
  nextStep: () => set((state) => ({ currentStep: state.currentStep + 1 })),
  previousStep: () => set((state) => ({ currentStep: Math.max(0, state.currentStep - 1) })),

  setInspectorActive: (active) => set({ isInspectorActive: active }),

  loadProfile: async (id) => {
    const profile = await window.electronAPI.getProfile(id);
    if (profile) {
      set({
        editingProfileId: id,
        name: profile.name,
        categoryUrl: profile.categoryUrl,
        productLinkSelector: profile.productLinkSelector || '',
        fieldSelectors: profile.fieldSelectors,
        preActions: profile.preActions,
        productPageActions: profile.productPageActions,
        paginationType: profile.pagination.type,
        paginationSelector: profile.pagination.selector,
        maxPages: profile.pagination.maxPages,
        concurrency: profile.concurrency,
        delayRange: profile.delayRange,
        retries: profile.retries,
        checkpointInterval: profile.checkpointInterval,
      });
    }
  },

  saveProfile: async () => {
    const state = get();
    set({ isSaving: true });

    try {
      const profile: SiteProfile = {
        name: state.name,
        categoryUrl: state.categoryUrl,
        productLinkSelector: state.productLinkSelector,
        fieldSelectors: state.fieldSelectors,
        preActions: state.preActions,
        productPageActions: state.productPageActions,
        pagination: {
          type: state.paginationType,
          selector: state.paginationSelector,
          maxPages: state.maxPages,
        },
        concurrency: state.concurrency,
        delayRange: state.delayRange,
        retries: state.retries,
        checkpointInterval: state.checkpointInterval,
      };

      if (state.editingProfileId) {
        await window.electronAPI.updateProfile(state.editingProfileId, profile);
        return state.editingProfileId;
      } else {
        const { id } = await window.electronAPI.createProfile(profile);
        return id;
      }
    } finally {
      set({ isSaving: false });
    }
  },

  reset: () => set(initialState),
}));
