import { ScraperConfig, SiteProfile, Action } from './types';

export function validateConfig(config: unknown): config is ScraperConfig {
  if (!config || typeof config !== 'object') return false;
  const cfg = config as any;

  if (!cfg.profiles || typeof cfg.profiles !== 'object') return false;

  return Object.values(cfg.profiles).every(validateProfile);
}

function validateProfile(profile: unknown): profile is SiteProfile {
  if (!profile || typeof profile !== 'object') return false;
  const p = profile as any;

  return (
    typeof p.name === 'string' &&
    typeof p.categoryUrl === 'string' &&
    Array.isArray(p.preActions) &&
    p.preActions.every(validateAction) &&
    typeof p.productLinkSelector === 'string' &&
    Array.isArray(p.productPageActions) &&
    p.productPageActions.every(validateAction) &&
    typeof p.fieldSelectors === 'object' &&
    typeof p.concurrency === 'number' &&
    Array.isArray(p.delayRange) &&
    p.delayRange.length === 2 &&
    typeof p.retries === 'number' &&
    typeof p.checkpointInterval === 'number'
  );
}

function validateAction(action: unknown): action is Action {
  if (!action || typeof action !== 'object') return false;
  const a = action as any;

  const validTypes = ['clickElement', 'sleep', 'scrollTo', 'waitForSelector', 'type'];
  return validTypes.includes(a.type);
}
