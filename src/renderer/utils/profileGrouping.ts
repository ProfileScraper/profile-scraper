import { ProfileWithMetadata } from '../../shared/types';

export function getDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return 'unknown';
  }
}

export function groupProfilesByDomain(profiles: ProfileWithMetadata[]): Map<string, ProfileWithMetadata[]> {
  const groups = new Map<string, ProfileWithMetadata[]>();

  for (const profile of profiles) {
    const domain = getDomain(profile.categoryUrl);
    if (!groups.has(domain)) {
      groups.set(domain, []);
    }
    groups.get(domain)!.push(profile);
  }

  // Sort profiles within each group by created_at descending
  for (const [domain, profileList] of groups.entries()) {
    profileList.sort((a, b) => b.created_at - a.created_at);
  }

  return groups;
}

export function sortDomains(domains: string[]): string[] {
  return domains.sort((a, b) => a.localeCompare(b));
}
