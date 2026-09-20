# DEV 투자자 데이터 팩 (Phase C, batchVersion=v2)

Production 적용·시드·배포·실푸시 금지. 이 문서는 **Development 전용**입니다.

## 한 줄 요약

`scripts/seed-investor-demo.ts`가 한국어 페르소나, 스크린 매장, 필드/스크린 조인, 홈 배너, 출석·업적 원장, 클럽/DM을 **기존 모델만** 사용해 멱등 upsert 합니다. 조인은 Prisma 직접 삽입이며 라이브 create API를 부르지 않습니다. 리셋은 데모 태그 행만 지웁니다.

## 실행 (Railway DEV)

가드가 `appVariant` / `railwayEnvironment` / `NODE_ENV` / `DATABASE_URL`을 검사합니다. Production 신호이거나 환경이 모호하면 **즉시 중단**합니다.

```bash
# 계획만 (DB 없이 가능)
pnpm exec tsx scripts/seed-investor-demo.ts --dry-run

# DEV API 컨테이너에서 시드 (권장)
railway run -s api -e development -- pnpm exec tsx scripts/seed-investor-demo.ts

# 태그된 행만 지운 뒤 다시 시드
railway run -s api -e development -- pnpm exec tsx scripts/seed-investor-demo.ts --reset

# 시드 없이 태그된 행만 삭제
railway run -s api -e development -- pnpm exec tsx scripts/seed-investor-demo.ts --reset-only
```

가드·카탈로그 증명:

```bash
pnpm exec tsx scripts/investor-demo-guard.node-test.ts
pnpm exec tsx scripts/investor-demo-catalog.node-test.ts
```

Railway TCP proxy처럼 RTT가 길면 Prisma 기본 인터랙티브 트랜잭션(5s)이 끊길 수 있습니다. 시드 전용 `PrismaClient`는 `timeout: 60_000` / `maxWait: 20_000`을 씁니다. Production API 원장 타임아웃은 바꾸지 않습니다.

## 안전 가드

아래 중 하나라도 해당하면 실패합니다 (fail-closed).

| 신호 | 결과 |
|---|---|
| `JJOIN_APP_VARIANT` / `APP_ENV` = production | 거부 |
| `RAILWAY_ENVIRONMENT` / `RAILWAY_ENVIRONMENT_NAME` = production | 거부 |
| `DATABASE_URL`에 production / `postgres-production` / `api-production` | 거부 |
| `NODE_ENV=production` 인데 명시적 development variant가 없음 | 거부 |
| variant·Railway·로컬 URL이 모두 비어 있음 | 거부 (모호) |

스크립트는 FCM/outbox/`JOIN_CREATED`를 만들지 않습니다. 출석·업적 알림은 `notifications` 인앱 행만, **의도된 히스토리 조인** 기준으로만 넣습니다. 모집 중 OPEN 조인을 대량으로 넣어도 출석·업적·지갑 보상을 자동 지급하지 않습니다.

## v2 규모

| 항목 | v1 | v2 |
|---|---|---|
| 페르소나 | 8 | 28 |
| 스크린 매장 | 4 | 20 |
| 배너 | 3 | 5 |
| 클럽 | 1 | 5 |
| SCREEN 조인 | 9 | 114 (OPEN 96 + 성사 18) |
| FIELD 조인 | 7 | 53 (OPEN 48 + 성사 5) |

시간은 시드 실행 시각(KST) 기준 상대값입니다. 오늘 저녁, 내일 오전/오후, 이번 주말, 다음 평일 저녁, 다음 주말, 2주 이내가 섞입니다. 고정된 과거 달력으로 활성 조인을 박지 않습니다.

## 지역

- SCREEN: 서울·고양/일산·파주·김포·인천·부천·광명·안양·성남/분당·용인·수원·화성·남양주·의정부 + 부산·대구·대전·광주
- FIELD: 기존 DEV 실코스 행을 우선 사용. 없으면 용인·이천·인천·가평·춘천·청주·천안·경주·김해·전주·순천·제주 fallback

## 시각 자산

레포 경로: `apps/mobile/assets/demo/investor/v2/`  
R2 키: `development/investor-demo/v2/{avatars\|stores\|banners\|field}/…` (production/ 금지)

- 아바타 28장: 허구의 한국인, 실사 스마트폰 초상
- 매장 커버 20 + 주요 매장 갤러리 (강남 4, 분당 3, 송도 3, 해운대 3, 송파 2)
- 배너 5: 사진 배경만, 이미지 속 문구 없음. 카피는 앱이 오버레이
- 필드/클럽 3장

시드가 R2(`MEDIA_STORAGE_MODE=r2`)면 같은 키로 업로드하고, 이미 같은 크기면 건너뜁니다.

## 리셋 범위

`--reset` / `--reset-only`는 아래 **태그만** 삭제합니다. 테이블 truncate 금지. 실기기 QA 페르소나는 유지합니다.

- subject `investor-demo-*` 사용자
- `clientIdempotencyKey` `investor-demo:` (v1·v2)
- 클럽 `invdemo-*` inviteCode / 카탈로그 이름
- 카탈로그 배너 제목
- `governmentSourceKey` `investor-demo-facility-*`
- fallback 코스 `investor-demo-course-*` (실 ODCloud 코스는 유지)
- venue `investor-demo-venue-*`
- 데모 사용자끼리의 DM

## 코디네이터 후속

1. 이 PR을 main에 머지하지 말 것
2. Production migrate/deploy/시드 하지 말 것
3. Railway **development**에서만 `--reset` 후 seed
4. Windows Android DEV 클라이언트로 홈·조인·매장·사람 화면 확인
5. Production 앱/DB는 사용하지 말 것
