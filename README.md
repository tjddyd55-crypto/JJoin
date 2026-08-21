# JJOIN

지역 기반 스포츠 조인 플랫폼 (MVP: 스크린골프). **Mobile App Primary.**

## Stack (Phase 2)

- Mobile: React Native + Expo + TypeScript + Expo Router
- Styling: StyleSheet + Design Tokens (`@jjoin/design-system`) — no Tailwind/NativeWind
- API: NestJS + PostgreSQL + Prisma
- Monorepo: pnpm workspaces

## Docs

### Architecture (Phase 2)
- [docs/architecture.md](docs/architecture.md)
- [docs/mobile-architecture.md](docs/mobile-architecture.md)
- [docs/backend-architecture.md](docs/backend-architecture.md)
- [docs/design-system.md](docs/design-system.md)
- [docs/database.md](docs/database.md)
- [docs/phase2-report.md](docs/phase2-report.md) ← Phase 2 Foundation
- [docs/phase3a-report.md](docs/phase3a-report.md) ← Phase 3A Auth Slice
- [docs/explore-map.md](docs/explore-map.md) ← Explore Figma UX (approved)
- [docs/naver-map-integration.md](docs/naver-map-integration.md) ← Naver Map D1
- [docs/location-presence.md](docs/location-presence.md) ← Presence privacy
- [docs/phase-d-report.md](docs/phase-d-report.md) ← **Phase D Explore / Map**


### Product / UX (Phase 1)
- [docs/product-overview.md](docs/product-overview.md)
- [docs/user-flow.md](docs/user-flow.md)
- [docs/domain-model.md](docs/domain-model.md)
- [docs/coin-settlement.md](docs/coin-settlement.md)
- [docs/auth-identity.md](docs/auth-identity.md)
- [docs/policy-tbd.md](docs/policy-tbd.md)
- [docs/figma-screen-map.md](docs/figma-screen-map.md)
- [docs/erd/erd.md](docs/erd/erd.md)
- [docs/ux-review.md](docs/ux-review.md)
- [docs/phase1-report.md](docs/phase1-report.md)

## Figma (Phase 1 UX SSOT)

https://www.figma.com/design/sL62yQIhgY1l0WUcksWuPo

## Quick start

```bash
pnpm install
cp .env.example .env   # and prisma/.env for DATABASE_URL (keep a single source to avoid conflict)
pnpm --filter @jjoin/types build
pnpm prisma:generate
pnpm typecheck
pnpm --filter @jjoin/api build
pnpm --filter @jjoin/api start:dev

# Mobile Explore Map requires Development Build (not Expo Go)
# Set EXPO_PUBLIC_NAVER_MAP_CLIENT_ID first
pnpm --filter @jjoin/mobile exec expo prebuild -p android
pnpm --filter @jjoin/mobile exec expo run:android
pnpm --filter @jjoin/mobile exec expo start --dev-client
```

## Principles

- Business logic ≠ UI — Design System swap-friendly
- Coin Ledger + Settlement integrity first
- Sport-agnostic domain (SCREEN_GOLF first)
- Shop = Future Scope
- POLICY_TBD 임의 확정 금지
