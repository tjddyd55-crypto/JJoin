import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ODCLOUD_FIELD_GOLF_PATH,
  buildOdcloudFieldGolfUrl,
  fetchAllOdcloudFieldGolfCourses,
  fetchOdcloudFieldGolfPage,
} from './odcloud-field-golf-client';

test('ODCloud URL uses page/perPage/serviceKey and does not invent extra filters', () => {
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
});

test('page parser reads the live ODCloud envelope shape', async () => {
  const page = await fetchOdcloudFieldGolfPage({
    serviceKey: 'test',
    page: 1,
    perPage: 2,
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          currentCount: 2,
          matchCount: 541,
          page: 1,
          perPage: 2,
          totalCount: 541,
          data: [{ 이름: 'A', 소재지: '경기' }, { name: 'B', address: '서울' }],
        }),
        { status: 200 },
      ),
  });
  assert.equal(page.totalCount, 541);
  assert.equal(page.items.length, 2);
  assert.equal(page.items[0]?.['이름'], 'A');
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
          page: 1,
          perPage: 2,
          totalCount: 541,
          data: [{ 이름: 'A' }, { 이름: 'B' }],
        }),
        { status: 200 },
      ),
  });
  assert.equal(result.pages, 1);
  assert.equal(result.items.length, 2);
  assert.equal(result.totalCount, 541);
});
