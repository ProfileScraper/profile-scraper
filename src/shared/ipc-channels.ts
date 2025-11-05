export const IPC_CHANNELS = {
  // Renderer → Main
  SCRAPE_START: 'scrape:start',
  SCRAPE_PAUSE: 'scrape:pause',
  SCRAPE_RESUME: 'scrape:resume',
  SCRAPE_STOP: 'scrape:stop',
  CONFIG_LOAD: 'config:load',
  CONFIG_SAVE: 'config:save',
  EXPORT_CSV: 'export:csv',
  EXPORT_JSON: 'export:json',

  // Main → Renderer
  SCRAPE_PROGRESS: 'scrape:progress',
  SCRAPE_PRODUCT: 'scrape:product',
  SCRAPE_ERROR: 'scrape:error',
  SCRAPE_COMPLETE: 'scrape:complete',
  LOG_MESSAGE: 'log:message',
} as const;
