import { DatabaseSync } from 'node:sqlite';
import { JobRepository } from '../../src/main/database/JobRepository';
import { SCHEMA } from '../../src/main/database/schema';

describe('JobRepository', () => {
  let db: DatabaseSync;
  let repo: JobRepository;
  let testProfileId: string;

  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    db.exec(SCHEMA.PROFILES);
    db.exec(SCHEMA.JOBS);
    db.exec(SCHEMA.JOB_ERRORS);
    repo = new JobRepository(db);

    // Create a test profile for foreign key constraint
    const stmt = db.prepare(`
      INSERT INTO profiles (
        id, name, created_at, updated_at, category_url,
        pre_actions, pagination, product_link_selector,
        product_page_actions, field_selectors, concurrency,
        delay_min, delay_max, retries, checkpoint_interval
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    testProfileId = 'test-profile-id';
    stmt.run(
      testProfileId,
      'Test Profile',
      Date.now(),
      Date.now(),
      'https://example.com',
      '[]',
      '{"type":"button","selector":".next","maxPages":5}',
      '.product a',
      '[]',
      '{}',
      3,
      2000,
      4000,
      3,
      10
    );
  });

  afterEach(() => {
    db.close();
  });

  test('should create a job and return ID', () => {
    const jobData = {
      profileId: testProfileId,
      totalProducts: 100
    };

    const id = repo.create(jobData);

    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');

    const job = repo.getById(id);
    expect(job?.profileId).toBe(testProfileId);
    expect(job?.status).toBe('running');
    expect(job?.totalProducts).toBe(100);
  });

  test('should update job progress', () => {
    const id = repo.create({ profileId: testProfileId, totalProducts: 50 });

    repo.updateProgress(id, {
      productsScraped: 25,
      successCount: 20,
      failCount: 5
    });

    const job = repo.getById(id);
    expect(job?.productsScraped).toBe(25);
    expect(job?.successCount).toBe(20);
    expect(job?.failCount).toBe(5);
  });

  test('should mark job as completed', () => {
    const id = repo.create({ profileId: testProfileId, totalProducts: 10 });

    repo.complete(id, {
      productsScraped: 10,
      successCount: 8,
      failCount: 2
    });

    const job = repo.getById(id);
    expect(job?.status).toBe('completed');
    expect(job?.completedAt).toBeTruthy();
  });

  test('should get all jobs', () => {
    repo.create({ profileId: testProfileId, totalProducts: 10 });
    repo.create({ profileId: testProfileId, totalProducts: 20 });

    const jobs = repo.getAll();
    expect(jobs).toHaveLength(2);
  });

  test('should get jobs by profile ID', () => {
    // Create a second test profile
    const stmt = db.prepare(`
      INSERT INTO profiles (
        id, name, created_at, updated_at, category_url,
        pre_actions, pagination, product_link_selector,
        product_page_actions, field_selectors, concurrency,
        delay_min, delay_max, retries, checkpoint_interval
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const testProfileId2 = 'test-profile-id-2';
    stmt.run(
      testProfileId2,
      'Test Profile 2',
      Date.now(),
      Date.now(),
      'https://example2.com',
      '[]',
      '{"type":"button","selector":".next","maxPages":5}',
      '.product a',
      '[]',
      '{}',
      3,
      2000,
      4000,
      3,
      10
    );

    repo.create({ profileId: testProfileId, totalProducts: 10 });
    repo.create({ profileId: testProfileId, totalProducts: 15 });
    repo.create({ profileId: testProfileId2, totalProducts: 20 });

    const jobs = repo.getByProfileId(testProfileId);
    expect(jobs).toHaveLength(2);
    expect(jobs.every(j => j.profileId === testProfileId)).toBe(true);
  });
});
