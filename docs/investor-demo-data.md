# DEV 투자자/데모 데이터 팩 (Phase C)

Production 적용·시드·배포·실푸시 금지. 이 문서는 **Development 전용**입니다.

## 한 줄 요약

`scripts/seed-investor-demo.ts`가 한국어 데모 페르소나, 스크린 매장, 필드/스크린 조인, 홈 배너, 출석·업적 원장, 클럽/DM을 **기존 모델만** 사용해 멱등 upsert 합니다. 리셋은 데모 태그 행만 지웁니다.

## 실행 (Railway DEV)

가드가 `appVariant` / `railwayEnvironment` / `NODE_ENV` / `DATABASE_URL`을 검사합니다. Production 신호이거나 환경이 모호하면 **즉시 중단**합니다.

```bash
# 계획만 (DB 없이 가능)
pnpm exec tsx scripts/seed-investor-demo.ts --dry-run

# DEV API 컨테이너에서 시드 (권장)
railway run -s api -e development -- pnpm exec tsx scripts/seed-investor-demo.ts

# 데모 행만 지운 뒤 다시 시드
railway run -s api -e development -- pnpm exec tsx scripts/seed-investor-demo.ts --reset

# 시드 없이 데모 행만 삭제
railway run -s api -e development -- pnpm exec tsx scripts/seed-investor-demo.ts --reset-only
```

가드 증명:

```bash
pnpm exec tsx scripts/investor-demo-guard.node-test.ts
```

## 안전 가드

아래 중 하나라도 해당하면 실패합니다 (fail-closed).

| 신호 | 결과 |
|---|---|
| `JJOIN_APP_VARIANT` / `APP_ENV` = production | 거부 |
| `RAILWAY_ENVIRONMENT` / `RAILWAY_ENVIRONMENT_NAME` = production | 거부 |
| `DATABASE_URL`에 production / `postgres-production` / `api-production` | 거부 |
| `NODE_ENV=production` 인데 명시적 development variant가 없음 | 거부 |
| variant·Railway·로컬 URL이 모두 비어 있음 | 거부 (모호) |

Railway Development는 `NODE_ENV=production`인 경우가 많습니다. **`RAILWAY_ENVIRONMENT=development` 또는 `JJOIN_APP_VARIANT=development`가 있으면 허용**합니다.

스크립트는 FCM/outbox를 만들지 않습니다. 출석·업적 알림은 `notifications` 인앱 행만 넣습니다.

## 페르소나

이메일은 가짜 도메인 `jjoin.zone.demo` 입니다. 실명·실계정·실기기가 아닙니다.

| 닉네임 | slug | 역할 | 출석(일) | 호스트 성사 | 참가 성사 |
|---|---|---|---|---|---|
| 정하준·데모 | hajun | 스크린 호스트 | 12 (오늘 포함) | 5 | 1 |
| 윤서아·데모 | seoa | 참가 플레이어 | 7 | 0 | 5 |
| 한도윤·데모 | doyun | 매장 오너 | 5 | 1 | 0 |
| 최예린·데모 | yerin | 입문 | 3 | 0 | 2 |
| 강민재·데모 | minjae | 클럽 총무 | 9 (어제까지) | 1 | 2 |
| 배지후·데모 | jihu | 평일 스크린 | 4 | 0 | 2 |
| 오하늘·데모 | haneul | 필드 | 6 | 0 | 3 |
| 임태현·데모 | taehyun | 필드 호스트 | 8 | 5 | 0 |

소셜 subject: `investor-demo-{slug}`. **절대 건드리지 않는 QA 계정:** `dev-persona-a/b/c/admin`, `김진우_DEV_A`, `박민수_DEV_B` 등 실기기 페르소나.

아바타는 DiceBear 일러스트(실존 인물 아님). 매장/배너는 mall demo와 같은 Pexels 골프 시설·코스 스톡입니다.

## 출석 · 업적 · 코인 (Phase B SSOT)

- 출석: `DailyAttendanceCheckIn` + `UserAttendanceStats` (KST `YYYY-MM-DD`)
- 호스트 업적: `Join.status = COMPLETED` 만 집계
- 참가 업적: `role = PARTICIPANT` AND `participationStatus = COMPLETED` 만 집계
- 코인: `CoinLedgerService.issueCoins` / `EVENT_REWARD`
- 멱등 키 (프로덕션과 동일):
  - `reward:attendance:{userId}:{kstDate}`
  - `reward:host_milestone:{userId}:{threshold}`
  - `reward:participation_milestone:{userId}:{threshold}`

두 번 실행해도 사용자·조인·코인이 복제되지 않습니다.

## 리셋 범위

`--reset` / `--reset-only`는 아래 **태그만** 삭제합니다. 테이블 truncate 금지.

- subject `investor-demo-*` 사용자 (원장 issuance를 먼저 삭제)
- 제목 `[INVESTOR-DEMO] ` 조인 / 클럽 / 배너
- `governmentSourceKey` `investor-demo-facility-*`
- fallback 코스 `investor-demo-course-*` (이미 있는 실 ODCloud 코스는 유지)
- venue `investor-demo-venue-*`
- 데모 사용자끼리의 DM

## 데모가 살아 보이는 화면

- 홈: 배너 3장 + 스크린/필드 조인 카드
- 스크린 매장: 강남/분당/수원/마포 공개 프로필
- 필드 조인: 기존 DEV 코스(없으면 fallback 실코스명) upcoming/completed
- 사람/프로필: 데모 닉네임·일러스트 아바타·핸디
- 내 보상/지갑: 출석 스트릭 + 호스트/참가 마일스톤 원장 (**데모 페르소나 계정** 기준. 실기기 `dev-persona-a`는 삭제/지급하지 않음)
- 클럽: `[INVESTOR-DEMO] 주말스퀘어 클럽`
- DM: 하준↔서아, 태현↔민재 (데모 계정 간)

실기기 DEV_A/B로 보면 홈·조인·매장·사람·배너가 채워집니다. DEV_A 본인 출석/업적은 앱에서 직접 찍으면 Phase B 경로로 쌓입니다.

## 코디네이터 후속

1. 이 PR을 main에 머지하지 말 것
2. Production migrate/deploy/시드 하지 말 것
3. Railway **development**에서만 seed 명령을 실행
4. 실기기 DEV 계정으로 홈·조인·보상 화면을 확인
5. 필요 시 `--reset` 후 재시드
