import { ActionExecutor } from '../../src/main/scraper/ActionExecutor';
import { Action } from '../../src/shared/types';

describe('ActionExecutor', () => {
  let mockPage: any;
  let executor: ActionExecutor;

  beforeEach(() => {
    mockPage = {
      click: jest.fn(),
      waitForTimeout: jest.fn(),
      locator: jest.fn(() => ({
        scrollIntoViewIfNeeded: jest.fn(),
      })),
      waitForSelector: jest.fn(),
      type: jest.fn(),
    };
    executor = new ActionExecutor();
  });

  test('should execute clickElement action', async () => {
    const action: Action = {
      type: 'clickElement',
      selector: '.button',
    };

    await executor.execute(mockPage, action);
    expect(mockPage.click).toHaveBeenCalledWith('.button');
  });

  test('should skip optional clickElement if selector not found', async () => {
    mockPage.click.mockRejectedValue(new Error('Selector not found'));

    const action: Action = {
      type: 'clickElement',
      selector: '.button',
      optional: true,
    };

    await expect(executor.execute(mockPage, action)).resolves.not.toThrow();
  });

  test('should execute sleep action', async () => {
    const action: Action = {
      type: 'sleep',
      duration: 1000,
    };

    await executor.execute(mockPage, action);
    expect(mockPage.waitForTimeout).toHaveBeenCalledWith(1000);
  });

  test('should execute scrollTo action', async () => {
    const mockLocator = { scrollIntoViewIfNeeded: jest.fn() };
    mockPage.locator.mockReturnValue(mockLocator);

    const action: Action = {
      type: 'scrollTo',
      selector: '.section',
    };

    await executor.execute(mockPage, action);
    expect(mockPage.locator).toHaveBeenCalledWith('.section');
    expect(mockLocator.scrollIntoViewIfNeeded).toHaveBeenCalled();
  });

  test('should execute waitForSelector action', async () => {
    const action: Action = {
      type: 'waitForSelector',
      selector: '.loaded',
      timeout: 5000,
    };

    await executor.execute(mockPage, action);
    expect(mockPage.waitForSelector).toHaveBeenCalledWith('.loaded', { timeout: 5000 });
  });

  test('should execute type action', async () => {
    const action: Action = {
      type: 'type',
      selector: 'input',
      text: 'hello',
    };

    await executor.execute(mockPage, action);
    expect(mockPage.type).toHaveBeenCalledWith('input', 'hello');
  });
});
