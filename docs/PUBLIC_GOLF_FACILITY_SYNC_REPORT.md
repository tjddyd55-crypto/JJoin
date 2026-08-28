# JJOIN PUBLIC GOLF FACILITY SYNC REPORT

날짜: 2026-08-25 (schedule ops 갱신: 2026-08-28)  
작업 트리: `C:\workspace\jjoin`  
결과 (sync 기능): production 배포 후 운영 중  
결과 (schedule 최적화 2026-08-28): **PUBLIC_GOLF_SYNC_DAILY_GATE_RETAINED**

Railway는 cron timezone을 지원하지 않음(UTC only).  
KST 1·16일 04:00를 day-of-month로 고정하면 월 경계에서 날짜가 하루 밀리거나 DOM이 달마다 달라지므로,  
**매일 19:00 UTC wake + script KST calendar gate**를 유지하는 것이 정확성 우선 결정.

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

- service display name: `public-golf-sync` (historical Railway id `973a2ee2-9848-4a90-b7df-8e479772968e`; former random name `caring-solace`)
- repo: `tjddyd55-crypto/JJoin` @ `main`
- config: `railway.worker.json` (no HTTP healthcheck; start → work → exit)
- startCommand: `pnpm exec tsx scripts/run-public-golf-facility-sync.ts`
- Railway cron (UTC only): `0 19 * * *` (= **매일 04:00 KST wake**)
- calendar gate in script: KST **1일 / 16일**만 실동기화 (`--force`는 수동)
- restartPolicy: NEVER
- vars: `DATABASE_URL` (Postgres ref), `NODE_ENV`, `DATA_GO_KR_SERVICE_KEY`
- next calendar sync example: **2026-09-01 04:00 KST** (wake `2026-08-31 19:00 UTC`; non-run days skip inside script)

### Why daily wake + KST gate (not `1,16` DOM)

Railway cron is **UTC-only** (no per-service timezone). KST 04:00 = UTC previous calendar day 19:00, so:

| Target KST | Equivalent UTC | UTC day-of-month |
|------------|----------------|------------------|
| 2026-09-01 04:00 | 2026-08-31 19:00 | **31** (Aug) |
| 2026-09-16 04:00 | 2026-09-15 19:00 | **15** |
| 2026-03-01 04:00 | 2026-02-28 19:00 | **28** (or 29 leap) |
| 2027-01-01 04:00 | 2026-12-31 19:00 | **31** (Dec) |

Naive `0 19 1,16 * *` would fire **KST 2일·17일 04:00** (하루 밀림) → FAIL.  
Fixed `0 19 15,L * *` / multi-schedule also fails month length / Railway single-schedule limits.

**Decision:** keep daily UTC wake + in-script KST gate as the accurate ops schedule.  
Do not remove the gate (manual/`--force` safety + scheduler drift defense).

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

## Remaining (historical — sync feature)

1. ~~sync 관련 변경을 `main`에 merge~~ (완료)
2. ~~production migrate / force sync~~ (운영 중)
3. schedule: Railway timezone 미지원 → daily+gate 유지 (`PUBLIC_GOLF_SYNC_DAILY_GATE_RETAINED`)

## Result

**PUBLIC_GOLF_SYNC_DAILY_GATE_RETAINED** (2026-08-28 schedule review)

Railway cron = UTC only. Naive `1,16` DOM would mis-fire KST dates.  
Production keeps `0 19 * * *` + script KST 1·16 gate + `--force`. DB sync logic unchanged.
