import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ODCLOUD_FIELD_GOLF_PATH,
  buildOdcloudFieldGolfUrl,
  fetchAllOdcloudFieldGolfCourses,
  fetchOdcloudFieldGolfPage,
} from './odcloud-field-golf-client';

test('ODCloud URL uses only page/perPage/serviceKey from the live probe', () => {
  const url = new URL(
    buildOdcloudFieldGolfUrl({
      serviceKey: 'KEY%2B1',
      page: 1,
      perPage: 2,
    }),
  );
  assert.equal(url.origin + url.pathname, `https://api.odcloud.kr/api${ODCLOUD_FIELD_GOLF_PATH}`);
  assert.equal(url.searchParams.get('page'), '1');
  assert.equal(url.searchParams.get('perPage'), '2');
  assert.equal(url.searchParams.get('serviceKey'), 'KEY+1');
  assert.equal(url.searchParams.get('returnType'), null);
  assert.deepEqual([...url.searchParams.keys()].sort(), ['page', 'perPage', 'serviceKey']);
});

test('page fetch does not send Authorization — header-only auth 401s on DEV', async () => {
  let seenAuth: string | null = 'unset';
  await fetchOdcloudFieldGolfPage({
    serviceKey: 'KEY%2B1',
    page: 1,
    perPage: 2,
    fetchImpl: async (_url, init) => {
      const headers = new Headers(init?.headers);
      seenAuth = headers.get('Authorization');
      return new Response(
        JSON.stringify({
          currentCount: 0,
          data: [],
          matchCount: 541,
          page: 1,
          perPage: 2,
          totalCount: 541,
        }),
        { status: 200 },
      );
    },
  });
  assert.equal(seenAuth, null);
});

test('page parser reads the live ODCloud envelope and Korean data[] keys', async () => {
  const page = await fetchOdcloudFieldGolfPage({
    serviceKey: 'test',
    page: 1,
    perPage: 2,
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          currentCount: 2,
          data: [
            {
              구분: '회원제',
              '면적(제곱미터)': 1533823,
              사업자: 'A',
              소재지: '강원특별자치도 원주시',
              이름: '오크밸리',
              지역: '강원',
              홀: 27,
            },
            {
              구분: '대중제',
              '면적(제곱미터)': 1000,
              사업자: 'B',
              소재지: '제주특별자치도',
              이름: '핀크스',
              지역: '제주',
              홀: 18,
            },
          ],
          matchCount: 541,
          page: 1,
          perPage: 2,
          totalCount: 541,
        }),
        { status: 200 },
      ),
  });
  assert.equal(page.totalCount, 541);
  assert.equal(page.matchCount, 541);
  assert.equal(page.items.length, 2);
  assert.equal(page.items[0]?.['이름'], '오크밸리');
  assert.equal(page.items[0]?.['홀'], 27);
});

test('401 auth error from live probe shape is surfaced', async () => {
  await assert.rejects(
    () =>
      fetchOdcloudFieldGolfPage({
        serviceKey: '',
        page: 1,
        fetchImpl: async () =>
          new Response(JSON.stringify({ code: -401, msg: '인증키는 필수 항목 입니다.' }), {
            status: 401,
          }),
      }),
    /ODCLOUD_FIELD_HTTP_401:인증키는 필수 항목 입니다/,
  );
});

test('pagination stops at maxPages for DEV sample import', async () => {
  const result = await fetchAllOdcloudFieldGolfCourses({
    serviceKey: 'test',
    perPage: 2,
    maxPages: 1,
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          currentCount: 2,
          data: [{ 이름: 'A' }, { 이름: 'B' }],
          matchCount: 541,
          page: 1,
          perPage: 2,
          totalCount: 541,
        }),
        { status: 200 },
      ),
  });
  assert.equal(result.pages, 1);
  assert.equal(result.items.length, 2);
  assert.equal(result.totalCount, 541);
});
