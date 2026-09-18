# FIELD 골프장 공개데이터 동기화

Join 엔진은 하나다. `Join.venueId` → `Venue`. 트랙은 `Venue.venueType = SCREEN | FIELD`.
FIELD 마스터는 `FieldGolfCourse`다. `GolfFacility`는 LOCALDATA 연습장 전용이라 확장하지 않는다.
활성화 경로는 SCREEN과 같다: search → `activate-venue` → Venue → Join create.

## SCREEN public-data (코드 SSOT)

- Client: `apps/api/src/modules/golf-facilities/sync/localdata-golf-client.ts`
- Default base: `https://apis.data.go.kr/1741000/golf_practice_ranges/info`
- Override: `LOCALDATA_GOLF_API_BASE_URL`
- Auth: `DATA_GO_KR_SERVICE_KEY`
- Soft-inactive via miss count; never hard-delete
- `GolfFacilitiesService.activateVenue` → `LOCALDATA_GOLF_VENUE_PROVIDER`

## SCREEN actual sync cadence

- Gate: `shouldRunOnKstCalendar` → **KST day === 1 OR 16** only (unless `force`)
- Runner comment: pair with UTC cron `0 19 * * *`
- FIELD reuses this same gate. No monthly / bi-monthly schedule.

## FIELD ODCloud schema (live DEV probe — do not re-guess)

Endpoint:

```
GET https://api.odcloud.kr/api/15118920/v1/uddi:0e5b12d2-1cc8-4caf-ba96-c2c7d1ef8d83
```

Auth that worked: query `serviceKey` = `DATA_GO_KR_SERVICE_KEY`.  
Authorization header alone → HTTP 401.

Params confirmed: `page`, `perPage`.

Envelope: `currentCount`, `data`, `matchCount`, `page`, `perPage`, `totalCount`.  
**totalCount = 541**.

Each `data[]` row (exact Korean names):

| key | type | example |
|---|---|---|
| 구분 | string | 회원제 |
| 면적(제곱미터) | number | 1533823 |
| 사업자 | string | operator |
| 소재지 | string | address |
| 이름 | string | course name |
| 지역 | string | 강원 |
| 홀 | number | 27 |

Normalize **only** these plus sync metadata (`sido`/`sigungu` derived, fingerprint, lastSyncedAt).  
No lat/lng/phone/license id in the payload. Map must fallback when coords are missing.

Dedupe: `이름+소재지+사업자` → else `이름+소재지`. No separate license id.

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
vars: DATABASE_URL, DATA_GO_KR_SERVICE_KEY
```
