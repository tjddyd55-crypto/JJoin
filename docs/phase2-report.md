# Phase 2 Report — Architecture SSOT · Repo Bootstrap · Domain Schema

> Date: 2026-08-21  
> Scope: Foundation only. No bulk product features.

## 1. Architecture Overview

| Layer | Stack |
|-------|--------|
| Mobile | React Native + Expo + TypeScript + Expo Router |
| Styling | StyleSheet + Design Tokens + `@jjoin/design-system` |
| Forbidden | Capacitor, Tailwind, NativeWind (main app) |
| API | NestJS + TypeScript + REST |
| DB | PostgreSQL + Prisma |
| Monorepo | pnpm workspaces |

## 2. Repository Structure

```
apps/mobile | api | admin(placeholder)
packages/design-system | domain | api-client | types | validation | i18n | config
prisma/schema.prisma + migrations/0001_foundation
docs/* (Phase 1 preserved + Architecture docs)
```

## 3. Mobile

- Expo Router tabs: 홈 / 탐색 / 만들기 / 내 조인 / MY
- Design System `Button` / tokens / i18n wired on Home
- Metro monorepo `watchFolders` configured
- Full screens / real OAuth: out of scope

## 4. Backend

Nest modules (skeleton): auth, identity, users, sports, venues, joins, participation, wallet, settlement, reports, media, health  
Provider ports: SocialAuth / Identity / VenueSearch / MediaStorage

## 5. Database

Prisma entities cover Phase 1 foundation (Shop excluded).  
Migration SQL: `prisma/migrations/0001_foundation/migration.sql`  
Uniques: social (provider, subject), join_participant (join,user), wallet (user,asset), settlement (participant), coin_tx idempotency_key

## 6. Design System

Tokens: colors, spacing, radius, typography, shadows, sizing  
Components: AppText, Stack, Button, UserAvatar, StatusBadge, CoinBadge, Modal

## 7. App Designer 대응

Visual change → `packages/design-system` tokens/components only.  
Domain/API packages remain stable.

## 8. Provider Architecture

Ports in `apps/api/src/providers/ports.ts`. Adapters not implemented (POLICY / Vendor TBD).

## 9. Validation

- `pnpm install` OK
- `pnpm typecheck` OK (all packages)
- `@jjoin/api` nest build OK
- Prisma validate OK
- Migration SQL generated (DB apply deferred until local Postgres available)
- Domain unit tests for SCREEN_GOLF duration OK

## 10. POLICY_TBD

See `docs/policy-tbd.md` — coin economy, identity vendor, gate final scope, refunds, etc. unchanged.

## 11. Next Vertical Slice

**Auth Mock → User Profile → Home/Explore Mock → Join Detail**  
(Do not start with full Wallet/Settlement implementation.)
