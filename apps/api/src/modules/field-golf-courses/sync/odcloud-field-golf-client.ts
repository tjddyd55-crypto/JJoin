/**
 * ODCloud file-data client — 문화체육관광부_전국 골프장 현황 (15118920).
 *
 * Live probe without a key (2026-09-18):
 *   GET /15118920/v1/uddi:0e5b12d2-1cc8-4caf-ba96-c2c7d1ef8d83?page=1&perPage=2
 *   HTTP 401 {"code":-401,"msg":"인증키는 필수 항목 입니다."}
 *
 * Query params confirmed by that probe: page, perPage, serviceKey.
 * Successful ODCloud envelope (data.go.kr file API):
 *   currentCount, matchCount, page, perPage, totalCount, data[]
 *
 * Official columns (data.go.kr 15118920, fetched 2026-09-18):
 *   지역/region, 이름/name, 사업자/owner, 소재지/address,
 *   면적(제곱미터)/area, 홀/"number of holes", 구분/type
 * Official row count: 541. No lat/lng/phone in the published column list.
 */

export const ODCLOUD_FIELD_GOLF_DEFAULT_BASE = 'https://api.odcloud.kr/api';
export const ODCLOUD_FIELD_GOLF_PATH =
  '/15118920/v1/uddi:0e5b12d2-1cc8-4caf-ba96-c2c7d1ef8d83';

export type OdcloudFieldGolfRawItem = Record<string, unknown>;

export type OdcloudFieldGolfPage = {
  page: number;
  perPage: number;
  currentCount: number;
  matchCount: number | null;
  totalCount: number;
  items: OdcloudFieldGolfRawItem[];
};

export type OdcloudFieldGolfFetchResult = {
  pages: number;
  totalCount: number;
  items: OdcloudFieldGolfRawItem[];
};

export function decodeOdcloudServiceKey(serviceKey: string): string {
  try {
    return decodeURIComponent(serviceKey);
  } catch {
    return serviceKey;
  }
}

export function buildOdcloudFieldGolfUrl(input: {
  serviceKey: string;
  page: number;
  perPage: number;
  baseUrl?: string;
}): string {
  const base = (input.baseUrl ?? process.env.ODCLOUD_FIELD_GOLF_API_BASE_URL ?? ODCLOUD_FIELD_GOLF_DEFAULT_BASE)
    .replace(/\/$/, '');
  const url = new URL(`${base}${ODCLOUD_FIELD_GOLF_PATH}`);
  url.searchParams.set('page', String(input.page));
  url.searchParams.set('perPage', String(input.perPage));
  url.searchParams.set('serviceKey', decodeOdcloudServiceKey(input.serviceKey));
  return url.toString();
}

type OdcloudEnvelope = {
  code?: number;
  msg?: string;
  currentCount?: number;
  matchCount?: number;
  page?: number;
  perPage?: number;
  totalCount?: number;
  data?: OdcloudFieldGolfRawItem[];
};

export async function fetchOdcloudFieldGolfPage(input: {
  serviceKey: string;
  page: number;
  perPage?: number;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}): Promise<OdcloudFieldGolfPage> {
  const perPage = input.perPage ?? 100;
  const url = buildOdcloudFieldGolfUrl({
    serviceKey: input.serviceKey,
    page: input.page,
    perPage,
    baseUrl: input.baseUrl,
  });
  const fetchImpl = input.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(url, { headers: { Accept: 'application/json' } });
  } catch (e) {
    const cause = e instanceof Error ? e.message : String(e);
    throw new Error(`ODCLOUD_FIELD_FETCH_FAILED:${cause}`);
  }
  const json = (await res.json()) as OdcloudEnvelope;
  if (!res.ok || (json.code != null && json.code !== 0)) {
    throw new Error(`ODCLOUD_FIELD_HTTP_${res.status}:${json.msg ?? json.code ?? 'error'}`);
  }
  if (!Array.isArray(json.data)) {
    throw new Error('ODCLOUD_FIELD_EMPTY_DATA');
  }
  const totalCount = Number(json.totalCount ?? json.matchCount ?? 0);
  if (!Number.isFinite(totalCount) || totalCount < 0) {
    throw new Error('ODCLOUD_FIELD_INVALID_TOTAL');
  }
  return {
    page: Number(json.page ?? input.page),
    perPage: Number(json.perPage ?? perPage),
    currentCount: Number(json.currentCount ?? json.data.length),
    matchCount: json.matchCount == null ? null : Number(json.matchCount),
    totalCount,
    items: json.data,
  };
}

export async function fetchAllOdcloudFieldGolfCourses(input: {
  serviceKey: string;
  perPage?: number;
  maxPages?: number;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  onPage?: (page: OdcloudFieldGolfPage, pagesDone: number, totalPages: number) => void;
}): Promise<OdcloudFieldGolfFetchResult> {
  const perPage = input.perPage ?? 100;
  const first = await fetchOdcloudFieldGolfPage({
    ...input,
    page: 1,
    perPage,
  });
  const effectivePageSize = Math.max(1, first.items.length || first.perPage || perPage);
  const totalPages = Math.max(1, Math.ceil(first.totalCount / effectivePageSize));
  const limitedPages = input.maxPages ? Math.min(totalPages, input.maxPages) : totalPages;
  const items = [...first.items];
  input.onPage?.(first, 1, limitedPages);

  for (let page = 2; page <= limitedPages; page += 1) {
    const next = await fetchOdcloudFieldGolfPage({
      ...input,
      page,
      perPage: effectivePageSize,
    });
    if (next.totalCount !== first.totalCount) {
      throw new Error(
        `ODCLOUD_FIELD_TOTAL_DRIFT:first=${first.totalCount}:page=${next.totalCount}:pageNo=${page}`,
      );
    }
    items.push(...next.items);
    input.onPage?.(next, page, limitedPages);
  }

  if (!input.maxPages && items.length < first.totalCount) {
    throw new Error(
      `ODCLOUD_FIELD_INCOMPLETE:fetched=${items.length}:totalCount=${first.totalCount}:pages=${limitedPages}`,
    );
  }

  return {
    pages: limitedPages,
    totalCount: first.totalCount,
    items,
  };
}
