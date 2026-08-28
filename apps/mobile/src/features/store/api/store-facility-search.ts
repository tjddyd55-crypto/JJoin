import type { GolfFacilityMapDto } from '@jjoin/types';
import type { ApiClient } from '@jjoin/api-client';

export class StoreFacilitySearchError extends Error {
  constructor(
    message: string,
    readonly code: 'EMPTY_QUERY' | 'NETWORK' | 'UNAUTHORIZED' | 'API',
  ) {
    super(message);
    this.name = 'StoreFacilitySearchError';
  }
}

export function dedupeGolfFacilities(items: GolfFacilityMapDto[]): GolfFacilityMapDto[] {
  const seen = new Set<string>();
  const out: GolfFacilityMapDto[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

/** Store verification — screen-eligible facilities only (existing SSOT). */
export function isStoreVerificationEligible(facility: GolfFacilityMapDto): boolean {
  return facility.isScreenJoinEligible === true;
}

export function formatFacilityRegion(facility: GolfFacilityMapDto): string | null {
  const parts = [facility.sido, facility.sigungu].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : null;
}

async function searchFacilities(
  api: ApiClient,
  query: {
    q?: string;
    sido?: string;
    sigungu?: string;
    limit?: number;
  },
): Promise<GolfFacilityMapDto[]> {
  try {
    const result = await api.searchGolfFacilities({
      ...query,
      screenOnly: true,
    });
    return dedupeGolfFacilities(result.items.filter(isStoreVerificationEligible));
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (msg.includes('api_error:401') || msg.includes('api_error:403')) {
      throw new StoreFacilitySearchError(
        '로그인이 필요합니다. 다시 로그인해 주세요.',
        'UNAUTHORIZED',
      );
    }
    if (msg.startsWith('network_error')) {
      throw new StoreFacilitySearchError(
        '매장을 불러오지 못했습니다. 네트워크 연결을 확인해 주세요.',
        'NETWORK',
      );
    }
    throw new StoreFacilitySearchError(
      '매장을 불러오지 못했습니다. 다시 시도해주세요.',
      'API',
    );
  }
}

export async function searchStoreFacilities(
  api: ApiClient,
  query: string,
  limit = 30,
): Promise<GolfFacilityMapDto[]> {
  const q = query.trim();
  if (q.length < 1) {
    throw new StoreFacilitySearchError(
      '매장명 또는 주소를 입력해주세요.',
      'EMPTY_QUERY',
    );
  }
  return searchFacilities(api, { q, limit });
}

export async function listStoreFacilitiesByDistrict(
  api: ApiClient,
  input: { sido: string; sigungu: string; q?: string; limit?: number },
): Promise<GolfFacilityMapDto[]> {
  return searchFacilities(api, {
    sido: input.sido,
    sigungu: input.sigungu,
    q: input.q?.trim() || undefined,
    limit: input.limit ?? 100,
  });
}
