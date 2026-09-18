# DEV 적용 — Major Feature Expansion

Production 적용/시드/배포 금지. 이 문서는 DEV 전용입니다.

## 1. 마이그레이션

```bash
# DEV DATABASE_URL 만 사용
pnpm --filter @jjoin/api exec prisma migrate deploy --schema ../../prisma/schema.prisma
# 또는 로컬
pnpm exec prisma migrate deploy --schema prisma/schema.prisma
```

마이그레이션 파일: `prisma/migrations/20260918070000_major_feature_expansion/migration.sql`

적용 후:

```bash
pnpm --filter @jjoin/api exec prisma generate --schema ../../prisma/schema.prisma
```

## 2. DEV fixture

```bash
railway run -s api -e development -- pnpm exec tsx scripts/ensure-dev-major-feature-expansion.ts
```

태그: `[QA-MAJOR-FEATURE-EXPANSION]`
- 공개 스크린 매장 프로필 약 5개
- 홈 배너 placeholder 3개
- Production URL/환경이면 스크립트가 중단됩니다.

## 3. 확인

- `GET /feature-flags` → `clubsUiEnabled=false`
- `GET /home-banners` → placeholder/관리 배너
- `GET /screen-stores` → 공개 매장 목록
- Admin HQ `/feature-flags`, `/reward-policy`, `/home-banners`, `/store-banner-ads`

## 4. Production 계획 (이번 작업에서 실행하지 않음)

1. main 머지 전 코드 리뷰
2. Production migrate는 별도 승인 후 additive SQL만
3. Production seed/dummy 데이터 금지
4. 실푸시/SMS/결제 경로 사용 금지
