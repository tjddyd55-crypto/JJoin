import Constants from 'expo-constants';
import type { ProductEventType, TrackProductEventsRequest } from '@jjoin/types';
import type { ApiClient } from '@jjoin/api-client';
import { recommendationImpressionDedupeKey } from '@jjoin/domain';

function resolveAppVariant(): 'development' | 'production' {
  const raw = (
    Constants.expoConfig?.extra as { appVariant?: string } | undefined
  )?.appVariant;
  return raw === 'development' ? 'development' : 'production';
}

/** Non-blocking product analytics — failures never affect navigation. */
export function trackProductEvents(api: ApiClient, events: TrackProductEventsRequest['events']): void {
  void api.trackProductEvents({ events }).catch(() => undefined);
}

export function trackRecommendationImpression(
  api: ApiClient,
  userId: string,
  joinId: string,
  surface: string,
): void {
  trackProductEvents(api, [
    {
      eventType: 'RECOMMENDATION_IMPRESSION',
      joinId,
      source: 'mobile',
      dedupeKey: recommendationImpressionDedupeKey(userId, joinId, surface),
    },
  ]);
}

export function trackRecommendationClick(
  api: ApiClient,
  joinId: string,
  contextId?: string,
): void {
  trackProductEvents(api, [
    {
      eventType: 'RECOMMENDATION_CLICK',
      joinId,
      source: 'mobile',
      metadata: contextId ? { recommendationContextId: contextId } : undefined,
    },
  ]);
}

export function trackProductEvent(
  api: ApiClient,
  eventType: ProductEventType,
  opts?: { joinId?: string; golfFacilityId?: string; metadata?: Record<string, unknown> },
): void {
  trackProductEvents(api, [
    {
      eventType,
      joinId: opts?.joinId,
      golfFacilityId: opts?.golfFacilityId,
      source: 'mobile',
      metadata: opts?.metadata,
    },
  ]);
}

export { resolveAppVariant };
