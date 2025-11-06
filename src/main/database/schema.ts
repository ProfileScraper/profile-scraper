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
      product_page_actions TEXT,
      field_selectors TEXT,
      concurrency INTEGER DEFAULT 3,
      delay_min INTEGER DEFAULT 2000,
      delay_max INTEGER DEFAULT 4000,
      retries INTEGER DEFAULT 3,
      checkpoint_interval INTEGER DEFAULT 10
    )
  `,
  JOBS: `
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      completed_at INTEGER,
      status TEXT NOT NULL,
      total_products INTEGER,
      products_scraped INTEGER,
      success_count INTEGER,
      fail_count INTEGER,
      output_dir TEXT,
      checkpoint_path TEXT,
      error_message TEXT,
      FOREIGN KEY (profile_id) REFERENCES profiles(id)
    )
  `,
  JOB_ERRORS: `
    CREATE TABLE IF NOT EXISTS job_errors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT NOT NULL,
      url TEXT NOT NULL,
      error_message TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY (job_id) REFERENCES jobs(id)
    )
  `
};
