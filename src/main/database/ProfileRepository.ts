import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import { SiteProfile } from '../../shared/types';

export interface ProfileRow {
  id: string;
  name: string;
  created_at: number;
  updated_at: number;
  category_url: string;
  pre_actions: string;
  pagination: string;
  product_link_selector: string | null;
  product_page_actions: string;
  field_selectors: string;
  concurrency: number;
  delay_min: number;
  delay_max: number;
  retries: number;
  checkpoint_interval: number;
}

export class ProfileRepository {
  constructor(private db: Database.Database) {}

  create(profile: SiteProfile): string {
    const id = randomUUID();
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO profiles (
        id, name, created_at, updated_at, category_url,
        pre_actions, pagination, product_link_selector,
        product_page_actions, field_selectors, concurrency,
        delay_min, delay_max, retries, checkpoint_interval
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      profile.name,
      now,
      now,
      profile.categoryUrl,
      JSON.stringify(profile.preActions),
      JSON.stringify(profile.pagination),
      profile.productLinkSelector || null,
      JSON.stringify(profile.productPageActions),
      JSON.stringify(profile.fieldSelectors),
      profile.concurrency,
      profile.delayRange[0],
      profile.delayRange[1],
      profile.retries,
      profile.checkpointInterval
    );

    return id;
  }

  getById(id: string): (SiteProfile & { id: string; createdAt: number; updatedAt: number }) | null {
    const stmt = this.db.prepare('SELECT * FROM profiles WHERE id = ?');
    const row = stmt.get(id) as ProfileRow | undefined;

    if (!row) return null;

    return this.rowToProfile(row);
  }

  getAll(): Array<SiteProfile & { id: string; createdAt: number; updatedAt: number }> {
    const stmt = this.db.prepare('SELECT * FROM profiles ORDER BY created_at DESC');
    const rows = stmt.all() as ProfileRow[];
    return rows.map(row => this.rowToProfile(row));
  }

  update(id: string, profile: SiteProfile): void {
    const now = Date.now();

    const stmt = this.db.prepare(`
      UPDATE profiles SET
        name = ?, updated_at = ?, category_url = ?,
        pre_actions = ?, pagination = ?, product_link_selector = ?,
        product_page_actions = ?, field_selectors = ?, concurrency = ?,
        delay_min = ?, delay_max = ?, retries = ?, checkpoint_interval = ?
      WHERE id = ?
    `);

    stmt.run(
      profile.name,
      now,
      profile.categoryUrl,
      JSON.stringify(profile.preActions),
      JSON.stringify(profile.pagination),
      profile.productLinkSelector || null,
      JSON.stringify(profile.productPageActions),
      JSON.stringify(profile.fieldSelectors),
      profile.concurrency,
      profile.delayRange[0],
      profile.delayRange[1],
      profile.retries,
      profile.checkpointInterval,
      id
    );
  }

  delete(id: string): void {
    const stmt = this.db.prepare('DELETE FROM profiles WHERE id = ?');
    stmt.run(id);
  }

  private rowToProfile(row: ProfileRow): SiteProfile & { id: string; createdAt: number; updatedAt: number } {
    try {
      return {
        id: row.id,
        name: row.name,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        categoryUrl: row.category_url,
        preActions: JSON.parse(row.pre_actions),
        pagination: JSON.parse(row.pagination),
        productLinkSelector: row.product_link_selector || undefined,
        productPageActions: JSON.parse(row.product_page_actions),
        fieldSelectors: JSON.parse(row.field_selectors),
        concurrency: row.concurrency,
        delayRange: [row.delay_min, row.delay_max],
        retries: row.retries,
        checkpointInterval: row.checkpoint_interval
      };
    } catch (error) {
      throw new Error(`Failed to parse profile data for ID ${row.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
