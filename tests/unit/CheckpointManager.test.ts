import { CheckpointManager } from '../../src/main/storage/CheckpointManager';
import * as fs from 'fs';
import * as path from 'path';

const TEST_OUTPUT_DIR = path.join(__dirname, '../test-output');
const CHECKPOINT_PATH = path.join(TEST_OUTPUT_DIR, 'progress.json');

describe('CheckpointManager', () => {
  let manager: CheckpointManager;

  beforeEach(() => {
    if (fs.existsSync(TEST_OUTPUT_DIR)) {
      fs.rmSync(TEST_OUTPUT_DIR, { recursive: true });
    }
    fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
    manager = new CheckpointManager(CHECKPOINT_PATH);
  });

  afterEach(() => {
    if (fs.existsSync(TEST_OUTPUT_DIR)) {
      fs.rmSync(TEST_OUTPUT_DIR, { recursive: true });
    }
  });

  test('should initialize with empty checkpoint', () => {
    const checkpoint = manager.load();
    expect(checkpoint).toBeNull();
  });

  test('should save and load checkpoint', () => {
    const data = {
      timestamp: new Date().toISOString(),
      profileName: 'test-profile',
      completed: ['url1', 'url2'],
      pending: ['url3', 'url4'],
      totalProducts: 4,
      successCount: 2,
      failCount: 0,
    };

    manager.save(data);
    const loaded = manager.load();

    expect(loaded).toEqual(data);
  });

  test('should add completed URL', () => {
    manager.addCompleted('url1', 'test-profile');
    const checkpoint = manager.load();

    expect(checkpoint?.completed).toContain('url1');
    expect(checkpoint?.successCount).toBe(1);
  });

  test('should check if URL is completed', () => {
    manager.addCompleted('url1', 'test-profile');

    expect(manager.isCompleted('url1')).toBe(true);
    expect(manager.isCompleted('url2')).toBe(false);
  });

  test('should reset checkpoint', () => {
    manager.addCompleted('url1', 'test-profile');
    manager.reset();

    expect(manager.load()).toBeNull();
    expect(fs.existsSync(CHECKPOINT_PATH)).toBe(false);
  });

  test('should return all completed URLs', () => {
    manager.addCompleted('url1', 'test-profile');
    manager.addCompleted('url2', 'test-profile');

    const completed = manager.getCompleted();
    expect(completed).toEqual(['url1', 'url2']);
    expect(completed).toHaveLength(2);
  });

  test('should not add duplicate URLs', () => {
    manager.addCompleted('url1', 'test-profile');
    manager.addCompleted('url1', 'test-profile'); // Duplicate

    const checkpoint = manager.load();
    expect(checkpoint?.completed).toEqual(['url1']); // Only one
    expect(checkpoint?.successCount).toBe(1); // Count not incremented
  });
});
