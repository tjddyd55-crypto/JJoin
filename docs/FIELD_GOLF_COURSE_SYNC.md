# FIELD 골프장 공개데이터 동기화

SCREEN LOCALDATA 연습장 파이프라인과 같은 Join 엔진을 재사용한다. FIELD는 `Venue.venueType = FIELD` + `FieldGolfCourse` 마스터다.

## SCREEN cadence (재사용, 신규 스케줄 없음)

증거:

- `docs/railway-deployment.md`: Railway cron `0 19 * * *` (매일 04:00 KST wake)
- `scripts/run-public-golf-facility-sync.ts`: `--force` 없으면 KST 1일·16일만 실제 sync
- `apps/api/src/modules/golf-facilities/sync/public-golf-facility-sync.service.ts` `shouldRunOnKstCalendar()`
- `prisma/schema.prisma` `PublicGolfFacilitySyncRun` 주석: 15-day / 1·16 KST

FIELD runner `scripts/run-field-golf-course-sync.ts`는 **같은 캘린더 게이트**를 호출한다.

## ODCloud 소스

- Dataset: 문화체육관광부_전국 골프장 현황_20241231
- Base: `https://api.odcloud.kr/api`
- Path: `/15118920/v1/uddi:0e5b12d2-1cc8-4caf-ba96-c2c7d1ef8d83`
- Auth: `ODCLOUD_SERVICE_KEY` (없으면 `DATA_GO_KR_SERVICE_KEY`). Railway/server only. Never `EXPO_PUBLIC_*`.

Live probe (key 없이, 2026-09-18):

```
GET ...?page=1&perPage=2
HTTP 401 {"code":-401,"msg":"인증키는 필수 항목 입니다."}
```

공식 컬럼 (data.go.kr 15118920 페이지):

| 항목명 | 영문 |
|---|---|
| 지역 | region |
| 이름 | name |
| 사업자 | owner |
| 소재지 | address |
| 면적(제곱미터) | area |
| 홀 | number of holes |
| 구분 | type |

공식 행 수: **541**. 위도/경도/전화는 컬럼 목록에 없음.

## DEV 명령

Production URL이면 즉시 abort.

```bash
# 1) DEV migrate
pnpm exec tsx scripts/ops/dev-field-golf-migrate.ts

# 2) sample then full import
pnpm exec tsx scripts/ops/dev-field-golf-import.ts --sample
pnpm exec tsx scripts/ops/dev-field-golf-import.ts --full --second-sync

# 3) QA report
pnpm exec tsx scripts/ops/dev-field-golf-qa-report.ts

# cron-compatible (same KST 1/16 gate)
pnpm exec tsx scripts/run-field-golf-course-sync.ts --force
```

Railway (optional, same cron as SCREEN):

```
startCommand: pnpm exec tsx scripts/run-field-golf-course-sync.ts
cron: 0 19 * * *
vars: DATABASE_URL, ODCLOUD_SERVICE_KEY or DATA_GO_KR_SERVICE_KEY
```
