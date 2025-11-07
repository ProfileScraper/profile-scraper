export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  profile?: any;
}

export interface ImportResult {
  success: boolean;
  profileId?: string;
  errors?: string[];
  warnings?: string[];
}
