import { useEffect } from 'react';
import { useScrapeStore } from '../store/scrapeStore';

export function useScraper() {
  const store = useScrapeStore();

  useEffect(() => {
    // Check if electronAPI is available
    if (!window.electronAPI) {
      console.error('electronAPI not available - preload script may not have loaded');
      return;
    }

    // Set up IPC listeners
    window.electronAPI.onProgress((progress) => {
      store.setProgress(progress);
    });

    window.electronAPI.onProduct((product) => {
      store.addProduct(product);
    });

    window.electronAPI.onError((error) => {
      store.addError(error);
    });

    window.electronAPI.onComplete((stats) => {
      store.setRunning(false);
      console.log('Scraping complete:', stats);
    });
  }, []);

  const startScrape = async (profileName: string) => {
    if (!window.electronAPI) return;
    store.reset();
    store.setRunning(true);
    await window.electronAPI.startScrape(profileName);
  };

  const pauseScrape = async () => {
    if (!window.electronAPI) return;
    store.setPaused(true);
    await window.electronAPI.pauseScrape();
  };

  const resumeScrape = async () => {
    if (!window.electronAPI) return;
    store.setPaused(false);
    await window.electronAPI.resumeScrape();
  };

  const stopScrape = async () => {
    if (!window.electronAPI) return;
    await window.electronAPI.stopScrape();
    store.setRunning(false);
  };

  return {
    ...store,
    startScrape,
    pauseScrape,
    resumeScrape,
    stopScrape,
  };
}
