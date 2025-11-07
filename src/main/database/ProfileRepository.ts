import { DatabaseSync } from 'node:sqlite';
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
  prepend_domain: number;
  product_page_actions: string;
  field_selectors: string;
  concurrency: number;
  delay_min: number;
  delay_max: number;
  retries: number;
  checkpoint_interval: number;
  headless: number;
  overwrite_existing: number;
  is_public: number;
  is_readonly: number;
  source_profile_id: string | null;
  source_url: string | null;
  author: string | null;
  description: string | null;
  tags: string | null;
  version: string | null;
  last_synced: number | null;
}

export class ProfileRepository {
  constructor(private db: DatabaseSync) {}

  create(profile: SiteProfile): string {
    const id = randomUUID();
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO profiles (
        id, name, created_at, updated_at, category_url,
        pre_actions, pagination, product_link_selector, prepend_domain,
        product_page_actions, field_selectors, concurrency,
        delay_min, delay_max, retries, checkpoint_interval,
        headless, overwrite_existing,
        is_public, is_readonly, source_profile_id, source_url,
        author, description, tags, version, last_synced
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      profile.prependDomain ? 1 : 0,
      JSON.stringify(profile.productPageActions),
      JSON.stringify(profile.fieldSelectors),
      profile.concurrency,
      profile.delayRange[0],
      profile.delayRange[1],
      profile.retries,
      profile.checkpointInterval,
      profile.headless !== false ? 1 : 0, // Default to headless (1) unless explicitly false
      profile.overwriteExisting ? 1 : 0, // Default to false (0)
      profile.isPublic ? 1 : 0,
      profile.isReadonly ? 1 : 0,
      profile.sourceProfileId || null,
      profile.sourceUrl || null,
      profile.author || null,
      profile.description || null,
      profile.tags ? JSON.stringify(profile.tags) : null,
      profile.version || null,
      profile.lastSynced || null
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
    const rows = stmt.all() as unknown as ProfileRow[];
    return rows.map(row => this.rowToProfile(row));
  }

  update(id: string, profile: SiteProfile): void {
    // Check if profile is read-only
    const existing = this.getById(id);
    if (existing?.isReadonly) {
      throw new Error('Cannot update read-only profile. Clone it first.');
    }

    const now = Date.now();

    const stmt = this.db.prepare(`
      UPDATE profiles SET
        name = ?, updated_at = ?, category_url = ?,
        pre_actions = ?, pagination = ?, product_link_selector = ?,
        prepend_domain = ?, product_page_actions = ?, field_selectors = ?,
        concurrency = ?, delay_min = ?, delay_max = ?,
        retries = ?, checkpoint_interval = ?, headless = ?,
        overwrite_existing = ?,
        author = ?, description = ?, tags = ?, version = ?
      WHERE id = ?
    `);

    stmt.run(
      profile.name,
      now,
      profile.categoryUrl,
      JSON.stringify(profile.preActions),
      JSON.stringify(profile.pagination),
      profile.productLinkSelector || null,
      profile.prependDomain ? 1 : 0,
      JSON.stringify(profile.productPageActions),
      JSON.stringify(profile.fieldSelectors),
      profile.concurrency,
      profile.delayRange[0],
      profile.delayRange[1],
      profile.retries,
      profile.checkpointInterval,
      profile.headless !== false ? 1 : 0,
      profile.overwriteExisting ? 1 : 0,
      profile.author || null,
      profile.description || null,
      profile.tags ? JSON.stringify(profile.tags) : null,
      profile.version || null,
      id
    );
  }

  delete(id: string): void {
    const stmt = this.db.prepare('DELETE FROM profiles WHERE id = ?');
    stmt.run(id);
  }

  private rowToProfile(row: ProfileRow): SiteProfile & { id: string; createdAt: number; updatedAt: number } {
    try {
      console.log('[ProfileRepository] Row data:', {
        id: row.id,
        headless: row.headless,
        overwrite_existing: row.overwrite_existing,
        headlessConverted: row.headless === 1,
        overwriteConverted: row.overwrite_existing === 1
      });

      return {
        id: row.id,
        name: row.name,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        categoryUrl: row.category_url,
        preActions: JSON.parse(row.pre_actions),
        pagination: JSON.parse(row.pagination),
        productLinkSelector: row.product_link_selector || undefined,
        prependDomain: row.prepend_domain === 1,
        productPageActions: JSON.parse(row.product_page_actions),
        fieldSelectors: JSON.parse(row.field_selectors),
        concurrency: row.concurrency,
        delayRange: [row.delay_min, row.delay_max],
        retries: row.retries,
        checkpointInterval: row.checkpoint_interval,
        headless: row.headless === 1,
        overwriteExisting: row.overwrite_existing === 1,
        isPublic: Boolean(row.is_public),
        isReadonly: Boolean(row.is_readonly),
        sourceProfileId: row.source_profile_id || undefined,
        sourceUrl: row.source_url || undefined,
        author: row.author || undefined,
        description: row.description || undefined,
        tags: row.tags ? JSON.parse(row.tags) : undefined,
        version: row.version || undefined,
        lastSynced: row.last_synced || undefined
      };
    } catch (error) {
      throw new Error(`Failed to parse profile data for ID ${row.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
