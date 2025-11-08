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

  // Profile operations
  PROFILE_CREATE: 'profile:create',
  PROFILE_UPDATE: 'profile:update',
  PROFILE_DELETE: 'profile:delete',
  PROFILE_GET: 'profile:get',
  PROFILE_GET_ALL: 'profile:get-all',
  PROFILE_EXPORT: 'profile:export',
  PROFILE_IMPORT_FILE: 'profile:import-file',
  PROFILE_IMPORT_URL: 'profile:import-url',
  PROFILE_VALIDATE_JSON: 'profile:validate-json',
  PROFILE_CLONE: 'profile:clone',
  PROFILE_TOGGLE_IN_LIBRARY: 'profile:toggle-in-library',

  // Profile Explorer operations
  PROFILE_EXPLORER_SYNC: 'profileExplorer:sync',
  PROFILE_EXPLORER_GET_ALL: 'profileExplorer:get-all',

  // GitHub authentication
  GITHUB_AUTH_START: 'github:auth:start',
  GITHUB_AUTH_STATUS: 'github:auth:status',
  GITHUB_AUTH_LOGOUT: 'github:auth:logout',
  GITHUB_AUTH_GET_USER: 'github:auth:get-user',

  // GitHub publishing
  GITHUB_PUBLISH_PROFILE: 'github:publish:profile',

  // Job operations
  JOB_GET_ALL: 'job:get-all',
  JOB_GET: 'job:get',
  JOB_GET_ERRORS: 'job:get-errors',
  JOB_GET_DATA: 'job:get-data',
  JOB_EXPORT_DATA: 'job:export-data',
  JOB_DELETE: 'job:delete',
  JOB_DELETE_EMPTY: 'job:delete-empty',
  JOB_GET_QUALITY_STATS: 'job:get-quality-stats',
  JOB_GET_SCREENSHOT: 'job:get-screenshot',

  // Data management operations
  DATA_GET_PRODUCTS: 'data:get-products',
  DATA_GET_PRODUCT_COUNT: 'data:get-product-count',
  DATA_SEARCH_PRODUCTS: 'data:search-products',
  DATA_DELETE_BY_JOB: 'data:delete-by-job',
  DATA_DELETE_OLD: 'data:delete-old',
  DATA_EXPORT: 'data:export',
  DATA_GET_STATS: 'data:get-stats',
  DATA_GET_FIELD_NAMES: 'data:get-field-names',

  // Product logs
  LOGS_GET_BY_PRODUCT_ID: 'logs:get-by-product-id',
  LOGS_GET_BY_JOB_ID: 'logs:get-by-job-id',

  // Testing
  PROFILE_TEST: 'profile:test',

  // Inspector
  INSPECTOR_OPEN: 'inspector:open',
  INSPECTOR_CLOSE: 'inspector:close',
  INSPECTOR_SELECT: 'inspector:select',

  // App updates
  APP_CHECK_FOR_UPDATES: 'app:check-for-updates',
  APP_OPEN_RELEASE_URL: 'app:open-release-url',
} as const;
