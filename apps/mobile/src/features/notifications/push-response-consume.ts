/**
 * Expo last-notification consume/dedupe.
 * `getLastNotificationResponseAsync` is sticky until cleared; claim once so
 * home-icon launch and the live tap listener cannot replay the same response.
 */

const consumedIdentifiers = new Set<string>();

export function resetConsumedNotificationResponsesForTest(): void {
  consumedIdentifiers.clear();
}

export function claimNotificationResponseOnce(identifier: string | null | undefined): boolean {
  const key = identifier?.trim();
  if (!key) return true;
  if (consumedIdentifiers.has(key)) return false;
  consumedIdentifiers.add(key);
  return true;
}

export function takeInitialNotificationResponse<T extends { identifier: string }>(
  last: T | null,
): T | null {
  if (!last) return null;
  return claimNotificationResponseOnce(last.identifier) ? last : null;
}
