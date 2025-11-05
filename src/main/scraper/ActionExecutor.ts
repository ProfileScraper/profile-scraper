import { Action } from '../../shared/types';
import { Page } from 'patchright';

export class ActionExecutor {
  async execute(page: Page, action: Action): Promise<void> {
    try {
      switch (action.type) {
        case 'clickElement':
          await page.click(action.selector!);
          break;

        case 'sleep':
          await page.waitForTimeout(action.duration!);
          break;

        case 'scrollTo':
          await page.locator(action.selector!).scrollIntoViewIfNeeded();
          break;

        case 'waitForSelector':
          await page.waitForSelector(action.selector!, {
            timeout: action.timeout ?? 5000,
          });
          break;

        case 'type':
          await page.type(action.selector!, action.text!);
          break;

        default:
          throw new Error(`Unknown action type: ${(action as any).type}`);
      }
    } catch (error) {
      if (action.optional) {
        console.log(`Optional action failed, continuing: ${action.type}`);
        return;
      }
      throw error;
    }
  }

  async executeSequence(page: Page, actions: Action[]): Promise<void> {
    for (const action of actions) {
      await this.execute(page, action);
    }
  }
}
