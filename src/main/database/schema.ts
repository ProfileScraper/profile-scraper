export const SCHEMA = {
  PROFILES: `
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      category_url TEXT NOT NULL,
      pre_actions TEXT,
      pagination TEXT NOT NULL,
      product_link_selector TEXT,
      prepend_domain INTEGER DEFAULT 0,
      product_page_actions TEXT,
      field_selectors TEXT,
      concurrency INTEGER DEFAULT 3,
      delay_min INTEGER DEFAULT 2000,
      delay_max INTEGER DEFAULT 4000,
      retries INTEGER DEFAULT 3,
      checkpoint_interval INTEGER DEFAULT 10,
      headless INTEGER DEFAULT 1,
      overwrite_existing INTEGER DEFAULT 0
    )
  `,
  JOBS: `
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      completed_at INTEGER,
      status TEXT NOT NULL,
      phase TEXT,
      total_products INTEGER,
      products_scraped INTEGER,
      success_count INTEGER,
      fail_count INTEGER,
      output_dir TEXT,
      checkpoint_path TEXT,
      error_message TEXT,
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    )
  `,
  JOB_ERRORS: `
    CREATE TABLE IF NOT EXISTS job_errors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT NOT NULL,
      url TEXT NOT NULL,
      error_message TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
    )
  `,
  PRODUCTS: `
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT NOT NULL,
      url TEXT NOT NULL,
      scraped_at INTEGER NOT NULL,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
      UNIQUE(job_id, url)
    )
  `,
  SCRAPE_DATA: `
    CREATE TABLE IF NOT EXISTS scrape_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      field_name TEXT NOT NULL,
      field_value TEXT,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `,
  PRODUCT_LOGS: `
    CREATE TABLE IF NOT EXISTS product_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      timestamp INTEGER NOT NULL,
      log_level TEXT NOT NULL,
      message TEXT NOT NULL,
      context TEXT,
      field_name TEXT,
      selector TEXT,
      element_count INTEGER,
      error_message TEXT,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `,
  PRODUCT_LOGS_INDEX: `
    CREATE INDEX IF NOT EXISTS idx_product_logs_product_id
    ON product_logs(product_id)
  `
};
