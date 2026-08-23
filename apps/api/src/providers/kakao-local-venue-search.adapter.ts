import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { defaultVenueSearchQuery } from '@jjoin/domain';
import {
  cappedRadiusMeters,
  venueSearchConfig,
} from './venue-search.config';
import type {
  VenueResolveInput,
  VenueSearchHit,
  VenueSearchInput,
  VenueSearchProvider,
} from './venue-search.types';

type KakaoKeywordDocument = {
  id: string;
  place_name: string;
  category_name?: string;
  phone?: string;
  address_name?: string;
  road_address_name?: string;
  x: string;
  y: string;
  place_url?: string;
  distance?: string;
};

type KakaoKeywordResponse = {
  meta?: {
    total_count?: number;
    pageable_count?: number;
    is_end?: boolean;
  };
  documents?: KakaoKeywordDocument[];
};

/**
 * Live Kakao Local keyword search.
 * Never persists results — request → normalize → return only.
 */
@Injectable()
export class KakaoLocalVenueSearchAdapter implements VenueSearchProvider {
  readonly name = 'KAKAO_LOCAL';

  async search(input: VenueSearchInput): Promise<VenueSearchHit[]> {
    const key = process.env.KAKAO_LOCAL_REST_API_KEY?.trim() || venueSearchConfig.restApiKey;
    if (!key) {
      throw new ServiceUnavailableException('KAKAO_UNAUTHORIZED');
    }

    const query = (input.query?.trim() || defaultVenueSearchQuery(input.sportCode)).trim();
    if (!query) {
      throw new BadGatewayException('INVALID_QUERY');
    }

    const merged = new Map<string, VenueSearchHit>();
    let page = 1;
    let isEnd = false;

    while (page <= venueSearchConfig.maxPages && !isEnd) {
      const body = await this.fetchPage(query, input, page);
      isEnd = body.meta?.is_end === true;
      for (const doc of body.documents ?? []) {
        const hit = this.normalize(doc);
        if (!hit) continue;
        if (!merged.has(hit.providerPlaceId)) {
          merged.set(hit.providerPlaceId, hit);
        }
      }
      if (isEnd) break;
      if ((body.documents?.length ?? 0) === 0) break;
      page += 1;
    }

    return [...merged.values()];
  }

  async resolveByPlaceId(input: VenueResolveInput): Promise<VenueSearchHit | null> {
    const query =
      input.query?.trim() || defaultVenueSearchQuery(input.sportCode);
    const near = await this.search({
      sportCode: input.sportCode,
      query,
      centerLat: input.centerLat,
      centerLng: input.centerLng,
      radiusMeters: venueSearchConfig.kakaoMaxRadiusMeters,
    });
    const foundNear = near.find((h) => h.providerPlaceId === input.providerPlaceId);
    if (foundNear) return foundNear;

    const unscoped = await this.search({
      sportCode: input.sportCode,
      query,
      centerLat: input.centerLat,
      centerLng: input.centerLng,
      unscoped: true,
    });
    return unscoped.find((h) => h.providerPlaceId === input.providerPlaceId) ?? null;
  }

  private async fetchPage(
    query: string,
    input: VenueSearchInput,
    page: number,
  ): Promise<KakaoKeywordResponse> {
    const url = new URL(venueSearchConfig.baseUrl);
    url.searchParams.set('query', query);
    url.searchParams.set('size', String(venueSearchConfig.pageSize));
    url.searchParams.set('page', String(page));
    url.searchParams.set('sort', 'accuracy');

    if (input.bounds) {
      const { west, south, east, north } = input.bounds;
      url.searchParams.set('rect', `${west},${south},${east},${north}`);
    } else if (!input.unscoped) {
      url.searchParams.set('x', String(input.centerLng));
      url.searchParams.set('y', String(input.centerLat));
      url.searchParams.set('radius', String(cappedRadiusMeters(input.radiusMeters)));
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), venueSearchConfig.timeoutMs);
    const started = Date.now();
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `KakaoAK ${process.env.KAKAO_LOCAL_REST_API_KEY?.trim() || venueSearchConfig.restApiKey}`,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });
      const durationMs = Date.now() - started;
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.info(
          `[venue-search] provider=KAKAO_LOCAL page=${page} status=${res.status} durationMs=${durationMs}`,
        );
      }
      if (res.status === 401 || res.status === 403) {
        throw new UnauthorizedException(
          res.status === 401 ? 'KAKAO_UNAUTHORIZED' : 'KAKAO_FORBIDDEN',
        );
      }
      if (res.status === 429) {
        throw new ServiceUnavailableException('KAKAO_QUOTA');
      }
      if (!res.ok) {
        throw new BadGatewayException('KAKAO_UPSTREAM');
      }
      return (await res.json()) as KakaoKeywordResponse;
    } catch (e) {
      if (e instanceof UnauthorizedException || e instanceof ServiceUnavailableException || e instanceof BadGatewayException) {
        throw e;
      }
      if (e instanceof Error && e.name === 'AbortError') {
        throw new GatewayTimeoutException('KAKAO_TIMEOUT');
      }
      throw new BadGatewayException('KAKAO_UPSTREAM');
    } finally {
      clearTimeout(timer);
    }
  }

  private normalize(doc: KakaoKeywordDocument): VenueSearchHit | null {
    if (!doc.id || !doc.place_name) return null;
    const longitude = Number(doc.x);
    const latitude = Number(doc.y);
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;
    if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
      return null;
    }
    const distanceRaw = doc.distance ? Number(doc.distance) : null;
    return {
      source: 'KAKAO_LOCAL',
      providerPlaceId: doc.id,
      name: doc.place_name,
      categoryName: doc.category_name?.trim() || null,
      phone: doc.phone?.trim() || null,
      address: doc.address_name?.trim() || null,
      roadAddress: doc.road_address_name?.trim() || null,
      longitude,
      latitude,
      placeUrl: doc.place_url?.trim() || null,
      distanceMeters:
        distanceRaw != null && Number.isFinite(distanceRaw) ? distanceRaw : null,
    };
  }
}
