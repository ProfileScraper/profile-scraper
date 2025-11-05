import { useEffect } from 'react';
import { useScrapeStore } from '../store/scrapeStore';

export function useScraper() {
  const store = useScrapeStore();

  useEffect(() => {
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
    store.reset();
    store.setRunning(true);
    await window.electronAPI.startScrape(profileName);
  };

  const pauseScrape = async () => {
    store.setPaused(true);
    await window.electronAPI.pauseScrape();
  };

  const resumeScrape = async () => {
    store.setPaused(false);
    await window.electronAPI.resumeScrape();
  };

  const stopScrape = async () => {
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
