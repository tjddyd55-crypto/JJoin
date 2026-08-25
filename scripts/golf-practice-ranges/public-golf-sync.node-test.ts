/**
 * Unit tests for public golf facility sync helpers (no live API / DB).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fetchAllLocaldataGolfFacilities } from '../../apps/api/src/modules/golf-facilities/sync/localdata-golf-client.ts';
import {
  normalizeLocaldataGolfItem,
  applyTmConversion,
} from '../../apps/api/src/modules/golf-facilities/sync/facility-normalize.ts';
import { shouldRunOnKstCalendar } from '../../apps/api/src/modules/golf-facilities/sync/public-golf-facility-sync.service.ts';

describe('localdata pagination', () => {
  it('fetches all pages until totalCount', async () => {
    const pages: Record<number, unknown> = {
      1: {
        response: {
          header: { resultCode: '00' },
          body: {
            totalCount: 3,
            pageNo: 1,
            numOfRows: 2,
            items: {
              item: [
                {
                  OPN_ATMY_GRP_CD: 'A',
                  MNG_NO: '1',
                  BPLC_NM: '테스트1',
                  SALS_STTS_CD: '01',
                  SALS_STTS_NM: '영업/정상',
                },
                {
                  OPN_ATMY_GRP_CD: 'A',
                  MNG_NO: '2',
                  BPLC_NM: '테스트2',
                  SALS_STTS_CD: '01',
                  SALS_STTS_NM: '영업/정상',
                },
              ],
            },
          },
        },
      },
      2: {
        response: {
          header: { resultCode: '00' },
          body: {
            totalCount: 3,
            pageNo: 2,
            numOfRows: 2,
            items: {
              item: {
                OPN_ATMY_GRP_CD: 'A',
                MNG_NO: '3',
                BPLC_NM: '스크린골프테스트',
                SALS_STTS_CD: '01',
                SALS_STTS_NM: '영업/정상',
              },
            },
          },
        },
      },
    };

    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      const pageNo = Number(new URL(url).searchParams.get('pageNo') ?? '1');
      return new Response(JSON.stringify(pages[pageNo]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };

    const result = await fetchAllLocaldataGolfFacilities({
      serviceKey: 'test',
      numOfRows: 2,
      fetchImpl,
    });
    assert.equal(result.pages, 2);
    assert.equal(result.totalCount, 3);
    assert.equal(result.items.length, 3);
  });

  it('uses effective page size when upstream caps rows', async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const pageNo = Number(new URL(String(input)).searchParams.get('pageNo') ?? '1');
      const items = Array.from({ length: 100 }, (_, i) => ({
        OPN_ATMY_GRP_CD: 'A',
        MNG_NO: `${pageNo}-${i}`,
        BPLC_NM: `시설${pageNo}-${i}`,
        SALS_STTS_CD: '01',
        SALS_STTS_NM: '영업/정상',
      }));
      return new Response(
        JSON.stringify({
          response: {
            header: { resultCode: '00' },
            body: {
              totalCount: 250,
              pageNo,
              numOfRows: 100,
              items: { item: items },
            },
          },
        }),
        { status: 200 },
      );
    };

    const result = await fetchAllLocaldataGolfFacilities({
      serviceKey: 'test',
      numOfRows: 1000,
      fetchImpl,
    });
    assert.equal(result.pages, 3);
    assert.equal(result.items.length, 300);
    assert.equal(result.totalCount, 250);
  });

  it('fails when total drifts mid-pagination', async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const pageNo = Number(new URL(String(input)).searchParams.get('pageNo') ?? '1');
      const totalCount = pageNo === 1 ? 4 : 2;
      return new Response(
        JSON.stringify({
          response: {
            header: { resultCode: '00' },
            body: {
              totalCount,
              pageNo,
              numOfRows: 2,
              items: {
                item: [
                  { OPN_ATMY_GRP_CD: 'A', MNG_NO: `${pageNo}a` },
                  { OPN_ATMY_GRP_CD: 'A', MNG_NO: `${pageNo}b` },
                ],
              },
            },
          },
        }),
        { status: 200 },
      );
    };

    await assert.rejects(
      () =>
        fetchAllLocaldataGolfFacilities({
          serviceKey: 'test',
          numOfRows: 2,
          fetchImpl,
        }),
      /LOCALDATA_TOTAL_DRIFT/,
    );
  });

  it('fails incomplete fetch under totalCount', async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const pageNo = Number(new URL(String(input)).searchParams.get('pageNo') ?? '1');
      const items =
        pageNo === 1
          ? Array.from({ length: 50 }, (_, i) => ({
              OPN_ATMY_GRP_CD: 'A',
              MNG_NO: String(i),
            }))
          : [];
      return new Response(
        JSON.stringify({
          response: {
            header: { resultCode: '00' },
            body: {
              totalCount: 500,
              pageNo,
              numOfRows: 50,
              items: { item: items },
            },
          },
        }),
        { status: 200 },
      );
    };

    await assert.rejects(
      () =>
        fetchAllLocaldataGolfFacilities({
          serviceKey: 'test',
          numOfRows: 100,
          fetchImpl,
        }),
      /LOCALDATA_INCOMPLETE/,
    );
  });
});

describe('normalize retains unknown / non-screen', () => {
  it('keeps UNKNOWN type facility (does not drop)', () => {
    const row = normalizeLocaldataGolfItem({
      OPN_ATMY_GRP_CD: '11110',
      MNG_NO: '999',
      BPLC_NM: '아무골프장',
      SALS_STTS_CD: '01',
      SALS_STTS_NM: '영업/정상',
    });
    assert.ok(row);
    assert.equal(row!.governmentSourceKey, '11110:999');
    assert.equal(row!.isActive, true);
    assert.ok(
      ['OTHER_GOLF_FACILITY', 'UNKNOWN', 'PRACTICE_RANGE'].includes(row!.facilityType),
    );
  });

  it('marks closed status inactive without dropping', () => {
    const row = normalizeLocaldataGolfItem({
      OPN_ATMY_GRP_CD: '11110',
      MNG_NO: '100',
      BPLC_NM: '폐업스크린골프',
      SALS_STTS_CD: '03',
      SALS_STTS_NM: '폐업',
    });
    assert.ok(row);
    assert.equal(row!.isActive, false);
    assert.equal(row!.facilityType, 'SCREEN_GOLF');
  });
});

describe('tm conversion', () => {
  it('marks invalid when conversion fails bounds', () => {
    const base = normalizeLocaldataGolfItem({
      OPN_ATMY_GRP_CD: '1',
      MNG_NO: '1',
      BPLC_NM: '테스트',
      SALS_STTS_CD: '01',
      SALS_STTS_NM: '영업/정상',
      CRD_INFO_X: '1',
      CRD_INFO_Y: '1',
    })!;
    const next = applyTmConversion(base, 10, 10, false);
    assert.equal(next.coordinateStatus, 'INVALID');
  });
});

describe('kst calendar gate', () => {
  it('allows 1st and 16th KST', () => {
    assert.equal(shouldRunOnKstCalendar(new Date('2026-07-31T15:30:00.000Z')), true);
    assert.equal(shouldRunOnKstCalendar(new Date('2026-08-15T19:00:00.000Z')), true);
    assert.equal(shouldRunOnKstCalendar(new Date('2026-08-01T19:00:00.000Z')), false);
  });
});
