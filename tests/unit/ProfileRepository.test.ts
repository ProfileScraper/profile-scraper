import { DatabaseSync } from 'node:sqlite';
import { ProfileRepository } from '../../src/main/database/ProfileRepository';
import { SiteProfile } from '../../src/shared/types';
import { SCHEMA } from '../../src/main/database/schema';

describe('ProfileRepository', () => {
  let db: DatabaseSync;
  let repo: ProfileRepository;

  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    db.exec(SCHEMA.PROFILES);
    repo = new ProfileRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  test('should create a profile and return ID', () => {
    const profile: SiteProfile = {
      name: 'Test Profile',
      categoryUrl: 'https://example.com/products',
      preActions: [],
      pagination: { type: 'button', selector: '.next', maxPages: 5 },
      productLinkSelector: '.product a',
      productPageActions: [],
      fieldSelectors: { title: '.title' },
      concurrency: 3,
      delayRange: [2000, 4000],
      retries: 3,
      checkpointInterval: 10
    };

    const id = repo.create(profile);

    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');

    const retrieved = repo.getById(id);
    expect(retrieved).toMatchObject({
      name: 'Test Profile',
      categoryUrl: 'https://example.com/products'
    });
  });

  test('should get all profiles', () => {
    const profile1: SiteProfile = {
      name: 'Profile 1',
      categoryUrl: 'https://example.com/p1',
      preActions: [],
      pagination: { type: 'button', selector: '.next', maxPages: 5 },
      productLinkSelector: '.product a',
      productPageActions: [],
      fieldSelectors: {},
      concurrency: 3,
      delayRange: [2000, 4000],
      retries: 3,
      checkpointInterval: 10
    };

    const profile2: SiteProfile = {
      name: 'Profile 2',
      categoryUrl: 'https://example.com/p2',
      preActions: [],
      pagination: { type: 'button', selector: '.next', maxPages: 5 },
      productLinkSelector: '.product a',
      productPageActions: [],
      fieldSelectors: {},
      concurrency: 3,
      delayRange: [2000, 4000],
      retries: 3,
      checkpointInterval: 10
    };

    repo.create(profile1);
    repo.create(profile2);

    const all = repo.getAll();
    expect(all).toHaveLength(2);
    expect(all.map(p => p.name)).toContain('Profile 1');
    expect(all.map(p => p.name)).toContain('Profile 2');
  });

  test('should update a profile', () => {
    const profile: SiteProfile = {
      name: 'Original',
      categoryUrl: 'https://example.com',
      preActions: [],
      pagination: { type: 'button', selector: '.next', maxPages: 5 },
      productLinkSelector: '.product a',
      productPageActions: [],
      fieldSelectors: {},
      concurrency: 3,
      delayRange: [2000, 4000],
      retries: 3,
      checkpointInterval: 10
    };

    const id = repo.create(profile);

    const updated: SiteProfile = {
      ...profile,
      name: 'Updated',
      concurrency: 5
    };

    repo.update(id, updated);

    const retrieved = repo.getById(id);
    expect(retrieved?.name).toBe('Updated');
    expect(retrieved?.concurrency).toBe(5);
  });

  test('should delete a profile', () => {
    const profile: SiteProfile = {
      name: 'To Delete',
      categoryUrl: 'https://example.com',
      preActions: [],
      pagination: { type: 'button', selector: '.next', maxPages: 5 },
      productLinkSelector: '.product a',
      productPageActions: [],
      fieldSelectors: {},
      concurrency: 3,
      delayRange: [2000, 4000],
      retries: 3,
      checkpointInterval: 10
    };

    const id = repo.create(profile);
    expect(repo.getById(id)).toBeTruthy();

    repo.delete(id);
    expect(repo.getById(id)).toBeNull();
  });
});
