import assert from 'node:assert/strict';
import test from 'node:test';
import { venueSearchConfig } from './venue-search.config';
import { KakaoLocalVenueSearchAdapter } from './kakao-local-venue-search.adapter';

const GEOJE = {
  sportCode: 'SCREEN_GOLF',
  centerLat: 34.8806,
  centerLng: 128.6211,
  bounds: { west: 128.6, south: 34.86, east: 128.64, north: 34.9 },
};

function mockFetchSequence(
  pages: Array<{ is_end: boolean; documents: Array<Record<string, string>> }>,
) {
  let call = 0;
  const calls: URL[] = [];
  // @ts-expect-error test stub
  globalThis.fetch = async (input: string | URL) => {
    const url = typeof input === 'string' ? new URL(input) : input;
    calls.push(url);
    const page = pages[call] ?? { is_end: true, documents: [] };
    call += 1;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        meta: { is_end: page.is_end, total_count: 99, pageable_count: 45 },
        documents: page.documents,
      }),
    };
  };
  return { getCalls: () => calls, getCallCount: () => call };
}

test('kakao adapter pages until is_end or max 3 pages', async () => {
  process.env.KAKAO_LOCAL_REST_API_KEY = 'test-key-not-real';
  venueSearchConfig.maxPages = 3;
  venueSearchConfig.pageSize = 15;
  const { getCallCount } = mockFetchSequence([
    {
      is_end: false,
      documents: [
        { id: '1', place_name: 'A', x: '128.6211', y: '34.8806', address_name: 'addr' },
      ],
    },
    {
      is_end: false,
      documents: [
        { id: '2', place_name: 'B', x: '128.622', y: '34.881', address_name: 'addr2' },
      ],
    },
    {
      is_end: false,
      documents: [
        { id: '3', place_name: 'C', x: '128.623', y: '34.882', address_name: 'addr3' },
      ],
    },
    {
      is_end: false,
      documents: [
        { id: '4', place_name: 'D', x: '128.624', y: '34.883', address_name: 'addr4' },
      ],
    },
  ]);

  const adapter = new KakaoLocalVenueSearchAdapter();
  const hits = await adapter.search(GEOJE);
  assert.equal(hits.length, 3);
  assert.equal(getCallCount(), 3);
  assert.equal(hits[0]?.source, 'KAKAO_LOCAL');
});

test('kakao adapter stops when is_end true on page 1', async () => {
  process.env.KAKAO_LOCAL_REST_API_KEY = 'test-key-not-real';
  const { getCallCount } = mockFetchSequence([
    {
      is_end: true,
      documents: [{ id: '9', place_name: 'Only', x: '128.6211', y: '34.8806' }],
    },
  ]);
  const adapter = new KakaoLocalVenueSearchAdapter();
  const hits = await adapter.search(GEOJE);
  assert.equal(hits.length, 1);
  assert.equal(getCallCount(), 1);
});

test('kakao adapter dedupes by id across pages', async () => {
  process.env.KAKAO_LOCAL_REST_API_KEY = 'test-key-not-real';
  mockFetchSequence([
    {
      is_end: false,
      documents: [{ id: 'dup', place_name: 'Same', x: '128.62', y: '34.88' }],
    },
    {
      is_end: true,
      documents: [
        { id: 'dup', place_name: 'Same', x: '128.62', y: '34.88' },
        { id: 'other', place_name: 'Other', x: '128.63', y: '34.89' },
      ],
    },
  ]);
  const adapter = new KakaoLocalVenueSearchAdapter();
  const hits = await adapter.search(GEOJE);
  assert.equal(hits.length, 2);
});

test('kakao adapter uses rect when bounds provided', async () => {
  process.env.KAKAO_LOCAL_REST_API_KEY = 'test-key-not-real';
  const { getCalls } = mockFetchSequence([{ is_end: true, documents: [] }]);
  const adapter = new KakaoLocalVenueSearchAdapter();
  await adapter.search(GEOJE);
  const url = getCalls()[0];
  assert.ok(url);
  assert.equal(url.searchParams.get('rect'), '128.6,34.86,128.64,34.9');
  assert.equal(url.searchParams.get('query'), '스크린골프');
});
