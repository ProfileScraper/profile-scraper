export interface SyncResult {
  success: boolean;
  profilesAdded: number;
  profilesUpdated: number;
  errors?: string[];
}

export interface PublicProfilesResponse {
  version: string;
  updated_at: number;
  profiles: any[];
}
