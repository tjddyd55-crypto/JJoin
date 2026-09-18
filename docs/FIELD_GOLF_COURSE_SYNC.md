# FIELD 골프장 공개데이터 동기화

Join 엔진은 하나다. `Join.venueId` → `Venue`. 트랙은 `Venue.venueType = SCREEN | FIELD`.
FIELD 마스터는 `FieldGolfCourse`다. `GolfFacility`는 LOCALDATA 연습장 전용
(`governmentSourceKey` / `managementNo` / `localGovernmentCode` 필수)이라 확장하지 않는다.
활성화 경로는 SCREEN과 같다: search → `activate-venue` → Venue → Join create.

## SCREEN public-data (코드 SSOT, `bc6ed4b` 포함 tip)

- Source brand: LOCALDATA golf practice ranges (data.go.kr), **not ODCloud**
- Client: `apps/api/src/modules/golf-facilities/sync/localdata-golf-client.ts`
- Default base (code): `https://apis.data.go.kr/1741000/golf_practice_ranges/info`
- Override env: `LOCALDATA_GOLF_API_BASE_URL`
- Auth env: `DATA_GO_KR_SERVICE_KEY` (`scripts/run-public-golf-facility-sync.ts` required)
- Normalize: `facility-normalize.ts` → source `LOCALDATA_GOLF_PRACTICE_RANGE`
- Sync: `PublicGolfFacilitySyncService`
- Upsert: `GolfFacility`. Soft-inactive via consecutive miss; never hard-delete
- Venue bridge: `GolfFacilitiesService.activateVenue` → `LOCALDATA_GOLF_VENUE_PROVIDER`

`GolfPracticeRangeService2/getGolfPracticeRangeList2` 문자열은 이 repo tip에 없다.
Railway에서 다른 LOCALDATA URL을 쓰면 `LOCALDATA_GOLF_API_BASE_URL`로만 덮는다.

## SCREEN actual sync cadence (인용)

- Gate: `shouldRunOnKstCalendar` → **KST day === 1 OR day === 16** only (unless `force`)
  - `apps/api/src/modules/golf-facilities/sync/public-golf-facility-sync.service.ts`
- Runner: `scripts/run-public-golf-facility-sync.ts`
- Package: `sync:public-golf-facilities` / `sync:public-golf-facilities:force`
- Runner comment: pair with UTC cron `0 19 * * *` (daily trigger; calendar gate skips non-1/16)
- Railway: `docs/railway-deployment.md` `public-golf-sync` = `0 19 * * *`

FIELD는 **같은** 게이트와 cron을 재사용한다. 월 1회 / 2개월 스케줄을 만들지 않는다.

## FIELD ODCloud schema (live)

Unauthenticated page probe (2026-09-18):

```
GET https://api.odcloud.kr/api/15118920/v1/uddi:0e5b12d2-1cc8-4caf-ba96-c2c7d1ef8d83?page=1&perPage=2
HTTP 401 {"code":-401,"msg":"인증키는 필수 항목 입니다."}
```

Live OAS (no key, 2026-09-18) `https://infuser.odcloud.kr/oas/docs?namespace=15118920/v1`:

| query | default |
|---|---|
| page | 1 |
| perPage | 10 |
| returnType | JSON |

Auth: header `Authorization` **or** query `serviceKey`.

Envelope: `page`, `perPage`, `totalCount`, `currentCount`, `matchCount`, `data[]`.

`data[]` keys:

| key | type |
|---|---|
| 지역 | string |
| 이름 | string |
| 사업자 | string |
| 소재지 | string |
| 면적(제곱미터) | integer |
| 홀 | integer |
| 구분 | string |

공식 데이터셋 행 수: **541**. lat/lng/phone 없음. 인증된 `data[0]` 키 덤프는 키가 있을 때:

```bash
pnpm dev:field-golf:probe
```

## DEV 명령

Production URL이면 즉시 abort.

```bash
pnpm dev:field-golf:probe
pnpm exec tsx scripts/ops/dev-field-golf-migrate.ts
pnpm exec tsx scripts/ops/dev-field-golf-import.ts --sample
pnpm exec tsx scripts/ops/dev-field-golf-import.ts --full --second-sync
pnpm exec tsx scripts/ops/dev-field-golf-qa-report.ts
pnpm exec tsx scripts/run-field-golf-course-sync.ts --force
```

Railway (optional sibling, **same** SCREEN cron):

```
startCommand: pnpm exec tsx scripts/run-field-golf-course-sync.ts
cron: 0 19 * * *
vars: DATABASE_URL, ODCLOUD_SERVICE_KEY or DATA_GO_KR_SERVICE_KEY
```
