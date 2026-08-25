/** LOCALDATA 골프연습장업 OpenAPI client (data.go.kr 1741000). */

export type LocaldataGolfRawItem = Record<string, unknown>;

export type LocaldataFetchPage = {
  pageNo: number;
  numOfRows: number;
  totalCount: number;
  items: LocaldataGolfRawItem[];
};

export type LocaldataFetchResult = {
  pages: number;
  totalCount: number;
  items: LocaldataGolfRawItem[];
};

const DEFAULT_BASE =
  'https://apis.data.go.kr/1741000/golf_practice_ranges/info';

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

export async function fetchLocaldataGolfPage(input: {
  serviceKey: string;
  pageNo: number;
  numOfRows?: number;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}): Promise<LocaldataFetchPage> {
  const numOfRows = input.numOfRows ?? 1000;
  const base = input.baseUrl ?? process.env.LOCALDATA_GOLF_API_BASE_URL ?? DEFAULT_BASE;
  // Keys in .env are often already percent-encoded; decode once so URLSearchParams encodes correctly.
  let serviceKey = input.serviceKey;
  try {
    serviceKey = decodeURIComponent(serviceKey);
  } catch {
    // keep raw
  }
  const url = new URL(base);
  url.searchParams.set('serviceKey', serviceKey);
  url.searchParams.set('pageNo', String(input.pageNo));
  url.searchParams.set('numOfRows', String(numOfRows));
  url.searchParams.set('type', 'json');

  const fetchImpl = input.fetchImpl ?? fetch;
  let res: Response;
  try {
    res = await fetchImpl(url.toString(), {
      headers: { Accept: 'application/json' },
    });
  } catch (e) {
    const cause =
      e instanceof Error && 'cause' in e && e.cause instanceof Error
        ? `${e.cause.name}:${e.cause.message}`
        : e instanceof Error
          ? e.message
          : String(e);
    throw new Error(`LOCALDATA_FETCH_FAILED:${cause}`);
  }
  if (!res.ok) {
    throw new Error(`LOCALDATA_HTTP_${res.status}`);
  }
  const json = (await res.json()) as {
    response?: {
      header?: { resultCode?: string; resultMsg?: string };
      body?: {
        totalCount?: number | string;
        pageNo?: number | string;
        numOfRows?: number | string;
        items?: { item?: LocaldataGolfRawItem | LocaldataGolfRawItem[] } | LocaldataGolfRawItem[];
      };
    };
  };

  const header = json.response?.header;
  if (header?.resultCode && header.resultCode !== '00' && header.resultCode !== '0') {
    throw new Error(`LOCALDATA_API_${header.resultCode}:${header.resultMsg ?? ''}`);
  }

  const body = json.response?.body;
  if (!body) {
    throw new Error('LOCALDATA_EMPTY_BODY');
  }

  const rawItems = body.items;
  let items: LocaldataGolfRawItem[] = [];
  if (Array.isArray(rawItems)) {
    items = rawItems;
  } else if (rawItems && typeof rawItems === 'object' && 'item' in rawItems) {
    items = asArray(
      (rawItems as { item?: LocaldataGolfRawItem | LocaldataGolfRawItem[] }).item,
    );
  }

  return {
    pageNo: Number(body.pageNo ?? input.pageNo),
    numOfRows: Number(body.numOfRows ?? numOfRows),
    totalCount: Number(body.totalCount ?? 0),
    items,
  };
}

/**
 * Full pagination until all pages fetched.
 * Throws if page count is incomplete vs totalCount.
 */
export async function fetchAllLocaldataGolfFacilities(input: {
  serviceKey: string;
  numOfRows?: number;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  onPage?: (page: LocaldataFetchPage, pagesDone: number, totalPages: number) => void;
}): Promise<LocaldataFetchResult> {
  const numOfRows = input.numOfRows ?? 1000;
  const first = await fetchLocaldataGolfPage({
    ...input,
    pageNo: 1,
    numOfRows,
  });
  if (!Number.isFinite(first.totalCount) || first.totalCount < 0) {
    throw new Error('LOCALDATA_INVALID_TOTAL');
  }
  // Upstream may cap page size below requested numOfRows — use actual page length.
  const effectivePageSize = Math.max(1, first.items.length || first.numOfRows || numOfRows);
  const totalPages = Math.max(1, Math.ceil(first.totalCount / effectivePageSize));
  const items = [...first.items];
  input.onPage?.(first, 1, totalPages);

  for (let pageNo = 2; pageNo <= totalPages; pageNo += 1) {
    const page = await fetchLocaldataGolfPage({
      ...input,
      pageNo,
      numOfRows: effectivePageSize,
    });
    if (page.totalCount !== first.totalCount) {
      throw new Error(
        `LOCALDATA_TOTAL_DRIFT:first=${first.totalCount}:page=${page.totalCount}:pageNo=${pageNo}`,
      );
    }
    items.push(...page.items);
    input.onPage?.(page, pageNo, totalPages);
  }

  // Allow small overshoot from last partial page; under-fetch is fatal.
  if (items.length < first.totalCount) {
    throw new Error(
      `LOCALDATA_INCOMPLETE:fetched=${items.length}:totalCount=${first.totalCount}:pages=${totalPages}:pageSize=${effectivePageSize}`,
    );
  }

  return {
    pages: totalPages,
    totalCount: first.totalCount,
    items,
  };
}
