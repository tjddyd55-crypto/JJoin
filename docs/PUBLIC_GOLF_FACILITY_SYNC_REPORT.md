# JJOIN PUBLIC GOLF FACILITY SYNC REPORT

날짜: 2026-08-25  
작업 트리: `C:\workspace\jjoin-main`  
결과: **PUBLIC_GOLF_SYNC_NEEDS_FIX** (로컬 PASS, production merge/deploy 미완)

## Source

- API: `https://apis.data.go.kr/1741000/golf_practice_ranges/info`
- pagination: `numOfRows=100` (upstream page-size cap 대응, effective page size 사용)
- raw records (full fetch): **17,903** / **180 pages**
- identity: `(source=LOCALDATA_GOLF, governmentSourceKey=OPN_ATMY_GRP_CD:MNG_NO)`
- 폐업/취소: 원본 `SALS_STTS_*` 기준 `isActive=false` (DELETE 없음)

## Database (local)

| metric | before | after (initial force sync) |
|--------|--------|----------------------------|
| total | 7,440 | **17,903** |
| active (영업/정상) | 7,440 | **7,440** |
| inactive (폐업 등) | 0 | **10,463** |
| VALID coords (active) | 7,168 | **7,168** |
| missing coords (active) | 272 | **272** |
| screen-eligible (metadata) | 2,848 | 2,848 |

Initial force sync:

- inserted: **10,463**
- updated: **7,125**
- unchanged: **315**
- geocoded (TM→WGS84): **16,978**
- inactive-by-miss: **0**

Idempotent rerun (fingerprint/TM reuse fix 후):

- inserted: **0**
- updated: **27** (소량 메타 변동)
- unchanged: **17,876**
- geocoded: **0**
- Venue FK linked (`golfFacilityId`): **2** (유지)

## Facility Types (active)

- SCREEN_GOLF: 2,469
- PRACTICE_RANGE / indoor / outdoor: 1,097 + 20 + 4
- GOLF_ACADEMY: 944
- MIXED: 435
- OTHER: 2,190
- UNKNOWN: 281

## Map

- bounds/search: `isActive + VALID` only — **classification filter 제거**
- activateVenue: active + VALID coords only (`isScreenJoinEligible` 미사용)
- selectable: VALID coords → Join 가능 (UNKNOWN/연습장 포함)
- icon/label: `facilityTypeLabel` — 스크린 / 연습장 / 기타 / 기본 골프시설

지도 노출 가능 (active+VALID): **7,168** (이전 screen-eligible 지도 필터 ≈2,759 대비 확대)

## Coordinates

- valid (active): 7,168
- missing (active): 272
- geocoded on initial: 16,978
- geocoded on idempotent: 0 (TM unchanged 시 재변환 스킵)

## Safety

- idempotency: insert 0 / geocode 0 on rerun; no duplicate key growth
- low-count guard: `max(5000, lastSuccess*0.5)` — 미달 시 `ABORTED_GUARD`, DB 유지
- incomplete pagination / total drift: fetch FAIL → upsert 안 함
- API failure: 기존 DB 유지, 전체 inactive 금지
- miss policy: `consecutiveMissCount` ≥ 3 연속 정상 sync에서만 soft-inactive (DELETE 금지)
- lock: `PublicGolfFacilitySyncRun status=RUNNING` (2h stale)

## Schedule (Railway)

- service: `caring-solace` (`973a2ee2-9848-4a90-b7df-8e479772968e`) — display rename API 불가
- repo: `tjddyd55-crypto/JJoin` @ `main`
- startCommand: `pnpm exec tsx scripts/run-public-golf-facility-sync.ts`
- cronSchedule: `0 19 * * *` UTC (= **04:00 KST daily**)
- calendar gate in script: KST **1일 / 16일**만 실동기화 (`--force`는 수동)
- restartPolicy: NEVER
- vars: `DATABASE_URL` (Postgres ref), `NODE_ENV`, `DATA_GO_KR_SERVICE_KEY` (PRESENT)
- next calendar sync: **2026-09-01 04:00 KST** (2026-08-31 19:00 UTC cron)

## Sample QA (Gwangjin)

| name | in DB | active | type | map-eligible (VALID) | screen-eligible |
|------|-------|--------|------|----------------------|-----------------|
| 아차산골프연습장 | YES | YES | PRACTICE_RANGE | YES | NO (metadata) |
| 아차산골프스쿨 | YES | YES | GOLF_ACADEMY | YES | NO |
| NK 골프클럽 | YES | YES | OTHER_GOLF_FACILITY | YES | NO |
| 광진 active+VALID | — | 35 | — | 35 | — |

외부 지도 상호를 강제 INSERT하지 않음.

## Tests

- unit (`scripts/golf-practice-ranges/public-golf-sync.node-test.ts`): **8 PASS**
  - full pagination, upstream page-size cap, total drift, incomplete fetch
  - unknown retained, closed→inactive, TM invalid, KST gate
- integration: local full sync + idempotent rerun SUCCESS
- production smoke: **NOT DONE** (코드 미머지)

## Manual run

```bash
pnpm sync:public-golf-facilities:force
# or
pnpm exec tsx scripts/run-public-golf-facility-sync.ts --force
```

## Architecture (요약)

- `localdata-golf-client` — fetch/pagination
- `facility-normalize` — 전건 보존 + 분류 metadata
- `PublicGolfFacilitySyncService` — lock/guard/upsert/miss/log
- CLI `scripts/run-public-golf-facility-sync.ts` — cron/manual 진입점
- migration `0009_public_golf_facility_sync` — additive (`lastSeenAt`, `consecutiveMissCount`, `sourceRawJson`, sync run table)

## Remaining for READY

1. sync 관련 변경을 `main`에 merge/push (현재 uncommitted / origin/main에 script·migration 없음)
2. production `0009` migrate
3. production `pnpm sync:public-golf-facilities:force` 1회
4. production smoke (count + Gwangjin + map bounds)

## Result

**PUBLIC_GOLF_SYNC_NEEDS_FIX**

로컬 게이트(전체 pagination, 분류 무관 upsert, UNKNOWN 지도 노출, idempotent, failure 보존, Railway cron 설정)는 충족.  
production merge · migrate · smoke가 PASS gate 미충족.
