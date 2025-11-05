import { create } from 'zustand';
import { ScrapeProgress, ProductData } from '../../shared/types';

interface ScrapeState {
  isRunning: boolean;
  isPaused: boolean;
  progress: ScrapeProgress | null;
  products: ProductData[];
  errors: any[];
  setRunning: (running: boolean) => void;
  setPaused: (paused: boolean) => void;
  setProgress: (progress: ScrapeProgress) => void;
  addProduct: (product: ProductData) => void;
  addError: (error: any) => void;
  reset: () => void;
}

export const useScrapeStore = create<ScrapeState>((set) => ({
  isRunning: false,
  isPaused: false,
  progress: null,
  products: [],
  errors: [],
  setRunning: (running) => set({ isRunning: running }),
  setPaused: (paused) => set({ isPaused: paused }),
  setProgress: (progress) => set({ progress }),
  addProduct: (product) => set((state) => ({ products: [...state.products, product] })),
  addError: (error) => set((state) => ({ errors: [...state.errors, error] })),
  reset: () => set({ products: [], errors: [], progress: null }),
}));
