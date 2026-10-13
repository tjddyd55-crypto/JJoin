import { isDevPersonaAvatarObjectKey } from './dev-persona-gallery';

/** Home people + golf-friends recommended cap. */
export const DEV_DEMO_RECOMMENDED_LIMIT = 20;

export function isDevInvestorDemoAvatarStorageKey(
  storageKey: string | null | undefined,
): boolean {
  if (!storageKey) return false;
  return isDevPersonaAvatarObjectKey(storageKey);
}

/**
 * On Development, seeded investor-demo personas lead the recommended list
 * for every viewer. Production ignores demo ids and keeps recency order.
 * The viewer is omitted either way; no admin or investor flag is required.
 */
export function mergeDevDemoRecommendedUserIds(input: {
  development: boolean;
  viewerId: string;
  demoUserIds: readonly string[];
  recentUserIds: readonly string[];
  limit?: number;
}): string[] {
  const limit = input.limit ?? DEV_DEMO_RECOMMENDED_LIMIT;
  const ordered: string[] = [];
  const seen = new Set<string>();
  const push = (id: string) => {
    if (!id || id === input.viewerId || seen.has(id) || ordered.length >= limit) return;
    seen.add(id);
    ordered.push(id);
  };
  if (input.development) {
    for (const id of input.demoUserIds) push(id);
  }
  for (const id of input.recentUserIds) push(id);
  return ordered;
}
