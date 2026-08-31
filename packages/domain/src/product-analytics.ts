/**
 * Product analytics event types and lightweight dedupe keys for impressions.
 */

export const PRODUCT_EVENT_TYPES = [
  'SHARE_LINK_CREATED',
  'SHARE_LINK_OPENED',
  'SHARE_JOIN_CTA_CLICKED',
  'RECOMMENDATION_IMPRESSION',
  'RECOMMENDATION_CLICK',
  'RECOMMENDATION_JOINED',
  'FOLLOWED_STORE_NEW_JOIN_SENT',
  'FOLLOWED_STORE_JOIN_CLICK',
  'FOLLOWED_STORE_JOINED',
  'URGENT_JOIN_OPENED',
  'URGENT_JOIN_VIEWED',
  'URGENT_JOIN_JOINED',
  'URGENT_JOIN_FILLED',
  'RECURRING_OCCURRENCE_CREATED',
  'RECURRING_JOIN_FILLED',
  'JOIN_INVITATION_SENT',
  'JOIN_INVITATION_ACCEPTED',
] as const;

export type ProductEventTypeName = (typeof PRODUCT_EVENT_TYPES)[number];

export function recommendationImpressionDedupeKey(
  userId: string,
  joinId: string,
  surface: string,
): string {
  return `rec-impression:${userId}:${joinId}:${surface}`;
}

export function recommendationAttributionMetadata(contextId: string): Record<string, string> {
  return { recommendationContextId: contextId };
}

export function computeConversionRate(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export function computeCtr(clicks: number, impressions: number): number | null {
  return computeConversionRate(clicks, impressions);
}
