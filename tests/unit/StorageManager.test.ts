import { StorageManager } from '../../src/main/storage/StorageManager';
import { ProductData } from '../../src/shared/types';
import * as fs from 'fs';
import * as path from 'path';

const TEST_OUTPUT_DIR = path.join(__dirname, '../test-output');

describe('StorageManager', () => {
  let manager: StorageManager;

  beforeEach(() => {
    if (fs.existsSync(TEST_OUTPUT_DIR)) {
      fs.rmSync(TEST_OUTPUT_DIR, { recursive: true });
    }
    fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
    manager = new StorageManager(TEST_OUTPUT_DIR);
  });

  afterEach(() => {
    if (fs.existsSync(TEST_OUTPUT_DIR)) {
      fs.rmSync(TEST_OUTPUT_DIR, { recursive: true });
    }
  });

  test('should initialize output directory', () => {
    expect(fs.existsSync(TEST_OUTPUT_DIR)).toBe(true);
  });

  test('should save product to JSON', async () => {
    const product: ProductData = {
      url: 'https://example.com/product1',
      scrapedAt: new Date().toISOString(),
      fields: {
        Brand: 'Aputure',
        Model: 'Nova P300c',
        'CCT Start': '2000',
      },
    };

    await manager.saveProduct(product);

    const jsonPath = path.join(TEST_OUTPUT_DIR, 'data.json');
    expect(fs.existsSync(jsonPath)).toBe(true);

    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    expect(data).toHaveLength(1);
    expect(data[0]).toEqual(product);
  });

  test('should append multiple products to JSON', async () => {
    const product1: ProductData = {
      url: 'https://example.com/product1',
      scrapedAt: new Date().toISOString(),
      fields: { Brand: 'Aputure' },
    };

    const product2: ProductData = {
      url: 'https://example.com/product2',
      scrapedAt: new Date().toISOString(),
      fields: { Brand: 'ARRI' },
    };

    await manager.saveProduct(product1);
    await manager.saveProduct(product2);

    const jsonPath = path.join(TEST_OUTPUT_DIR, 'data.json');
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

    expect(data).toHaveLength(2);
    expect(data[0]).toEqual(product1);
    expect(data[1]).toEqual(product2);
  });

  test('should save product to CSV', async () => {
    const product: ProductData = {
      url: 'https://example.com/product1',
      scrapedAt: new Date().toISOString(),
      fields: {
        Brand: 'Aputure',
        Model: 'Nova P300c',
        'CCT Start': '2000',
      },
    };

    await manager.saveProduct(product);

    const csvPath = path.join(TEST_OUTPUT_DIR, 'data.csv');
    expect(fs.existsSync(csvPath)).toBe(true);

    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    expect(csvContent).toContain('Brand,CCT Start,Model,url,scrapedAt');
    expect(csvContent).toContain('Aputure,2000,Nova P300c');
  });
});
