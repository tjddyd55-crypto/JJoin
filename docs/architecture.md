# Architecture SSOT (Phase 2)

> Phase 1 Product/UX/Figma를 유지한 채 기술 Foundation을 고정한다.  
> Mobile App Primary. WebView/Capacitor 금지. Shop Future.

## 1. Product Core (불변)

```
LOCATION → VENUE → JOIN → PARTICIPATION → GAME → REWARD → WALLET
                                                      └→ (Future) COMMERCE
```

- MVP Sport: `SCREEN_GOLF` (Domain은 sport-agnostic)
- Shop / PRODUCT / ORDER: Migration·API·UI 제외 (Vision만 유지)

## 2. Tech Stack Decisions (ADR)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Client primary | iOS/Android Native-feel App | Mobile App Primary |
| Mobile | React Native + Expo + TypeScript | 생산성 + native module 경로 |
| Routing | Expo Router | file-based, RN FM |
| Styling | StyleSheet + Design Tokens + Components | Designer swap-friendly |
| Tailwind/NativeWind | **금지** | utility class → Design Layer 결합 위험 |
| Capacitor/WebView shell | **금지** | 본체는 RN App |
| Backend | NestJS + TypeScript | modular domain |
| DB | PostgreSQL | ledger/settlement consistency |
| ORM | Prisma | schema SSOT + migration |
| API | REST | multi-client ready |
| Monorepo | pnpm workspaces | shared types/domain/DS |
| Queue (future) | Redis + BullMQ slot | auto-pay / notify |

## 3. Repository Layout

```
jjoin/
  apps/
    mobile/          # Expo RN app
    api/             # NestJS
    admin/           # placeholder
  packages/
    design-system/   # tokens + UI primitives
    types/           # shared TS types / enums
    domain/          # pure domain helpers (no UI)
    validation/      # zod schemas
    api-client/      # typed REST client skeleton
    i18n/            # ko-KR default catalogs
    config/          # eslint/tsconfig shared
  prisma/            # schema + migrations
  docs/              # Phase1 + Architecture SSOT
```

## 4. Layering

```
Presentation (apps/mobile screens + design-system)
    ↓
Application hooks / feature orchestration
    ↓
API Client (packages/api-client)
    ↓
NestJS Modules (apps/api)
    ↓
Domain services + Prisma
    ↓
PostgreSQL
```

**UI는 Domain에 종속되지 않는다. Domain은 UI에 종속되지 않는다.**

## 5. Provider Adapters

| Port | Adapters (future) |
|------|-------------------|
| SocialAuthProvider | Kakao, Naver, Google |
| IdentityVerificationProvider | NICE, KCB, PASS |
| VenueSearchProvider | Naver, Kakao, Google |
| MediaStorageProvider | S3, R2, S3-compatible |

Vendor SDK는 Adapter 밖으로 Domain에 침투하지 않는다.

## 6. Coin Integrity

- `WALLET` + `COIN_TRANSACTION` + `COIN_HOLD`
- ROOM_CREATION_FEE ≠ JOIN_REWARD
- Settlement는 participant 단위
- HOLD → PAID / AUTO_PAID / DISPUTED / REFUNDED
- Atomic DB transaction + Idempotency key

정책 숫자는 코드/마이그레이션에 하드코딩하지 않음 (`POLICY_TBD`).

## 7. Locale Defaults

- country=KR, locale=ko-KR, currency=KRW, timezone=Asia/Seoul
- DB timestamptz UTC 저장, 표시 시 timezone 변환
- i18n package 초기부터 존재

## 8. Designer Swap Checklist

1. Primary color → tokens only  
2. Radius/spacing/typography → tokens  
3. Button/Avatar/JoinCard → design-system components  
4. Wallet/Join domain logic untouched by visual change  
5. No Tailwind/inline hardcoding as default style path  

## 9. Related Docs

- [mobile-architecture.md](./mobile-architecture.md)
- [backend-architecture.md](./backend-architecture.md)
- [design-system.md](./design-system.md)
- [database.md](./database.md)
- [phase3a-report.md](./phase3a-report.md)
- Phase 1: product-overview, user-flow, domain-model, auth-identity, coin-settlement
