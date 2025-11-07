import { ValidationResult } from '../../shared/validation-types';

export class ProfileValidator {
  static validate(json: string): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    };

    try {
      const profile = JSON.parse(json);
      result.profile = profile;

      // Required fields
      if (!profile.name) result.errors.push("Missing required field 'name'");
      if (!profile.categoryUrl) result.errors.push("Missing required field 'categoryUrl'");
      if (!profile.fieldSelectors) result.errors.push("Missing required field 'fieldSelectors'");
      if (!profile.pagination) result.errors.push("Missing required field 'pagination'");

      // Type validation
      if (profile.preActions && !Array.isArray(profile.preActions)) {
        result.errors.push("Field 'preActions' must be an array");
      }
      if (profile.productPageActions && !Array.isArray(profile.productPageActions)) {
        result.errors.push("Field 'productPageActions' must be an array");
      }
      if (profile.fieldSelectors && typeof profile.fieldSelectors !== 'object') {
        result.errors.push("Field 'fieldSelectors' must be an object");
      }

      // Bounds validation
      if (profile.concurrency !== undefined && profile.concurrency <= 0) {
        result.errors.push("Field 'concurrency' must be greater than 0");
      }
      if (profile.retries !== undefined && profile.retries < 0) {
        result.errors.push("Field 'retries' cannot be negative");
      }

      // Selector warnings
      if (profile.productLinkSelector && !this.looksLikeCSSSelector(profile.productLinkSelector)) {
        result.warnings.push(`Selector '${profile.productLinkSelector}' may be malformed`);
      }

      result.valid = result.errors.length === 0;

    } catch (error) {
      result.valid = false;
      result.errors.push(`Invalid JSON: ${error.message}`);
    }

    return result;
  }

  private static looksLikeCSSSelector(selector: string): boolean {
    // Basic heuristic: should contain . or # or tag name or [
    return /^[a-z#.\[]/.test(selector.trim());
  }
}
