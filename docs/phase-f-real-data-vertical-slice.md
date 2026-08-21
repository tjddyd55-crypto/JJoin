# Phase F — Real Data Vertical Slice

A가 조인을 만들고 → B가 발견/참가 → A가 승인 → 양쪽 MY JOIN에 PostgreSQL 반영.

Related SSOT:

- Auth/Identity: [`docs/auth-identity.md`](./auth-identity.md)
- Domain / duration: [`docs/domain-model.md`](./domain-model.md)
- Railway: [`docs/railway-deployment.md`](./railway-deployment.md)

## Scope

In:

- DEV_A / DEV_B stable PostgreSQL users (mock auth)
- Venue upsert (`MOCK` + stable `providerPlaceId`)
- Join create / explore merge / detail / apply / approve / my joins
- Mobile wiring (Create, Explore preview → Detail, My Joins)
- Signed session tokens (redeploy-safe)

Out:

- Real OAuth / Identity Provider
- Actual Venue Provider / PostGIS
- Coin ledger (Hold / Transfer / Settlement)
- Push / Chat / Shop / Admin / iOS

## DEV Persona

| Persona | Nickname | `providerSubject` | Typical role in QA |
|---------|----------|-------------------|--------------------|
| DEV_A | 김진우 | `dev-persona-a` | Host |
| DEV_B | 박민수 | `dev-persona-b` | Participant |

HOST/PARTICIPANT는 계정 role이 아님. JoinParticipant.role만 사용.

Guard: `SOCIAL_AUTH_MODE=mock` (또는 equivalent). `disabled`면 mock sign-in 차단.

Login UI: `__DEV__` only — `[ A ] [ B ]` + NEW/RETURNING scenario.

## Auth

- `POST /auth/social/mock-sign-in` + `{ persona: 'DEV_A' | 'DEV_B' }`
- SocialAccount `@@unique([provider, providerSubject])` upsert
- Session: HMAC token `jjoin.<payload>.<sig>` (`JWT_SECRET`) — Railway redeploy 후에도 userId 복구 + Me lazy load

## APIs

| Method | Path | Notes |
|--------|------|--------|
| POST | `/joins` | currentUser = host |
| GET | `/joins/mine` | hosted + participating |
| GET | `/joins/:joinId` | detail |
| POST | `/joins/:joinId/apply` | → APPLIED |
| POST | `/joins/:joinId/participants/:participantId/approve` | host only |
| GET | `/explore/map` | mock venues + **DB** open join previews |

## Join lifecycle (Phase F)

- Create → status `OPEN`, Host participant `APPROVED`, `confirmedPlayerCount=1`
- Apply → `APPLIED`
- Approve → `APPROVED`, recompute confirmed count + `scheduledEndAt`, maybe `FULL`
- Coin fields: snapshot only — **COIN_ACCOUNTING_PENDING** (fee/hold = 0, no ledger rows)

## Venue

- Explore fixtures keep Map UX
- Join FK: `provider=MOCK`, `providerPlaceId=<fixture venueId>` upsert
- Duplicate venue rows forbidden via unique

## One-device two-persona QA

1. DEV_A 로그인 → Create → Join 생성
2. 로그아웃 → DEV_B 로그인 → Explore에서 preview 확인 → Detail → 참가 신청 → My Joins APPLIED
3. 로그아웃 → DEV_A → My Joins → Detail → 승인
4. DEV_B → My Joins → APPROVED

## Smoke

```powershell
$env:API_BASE='https://api-production-2d67e.up.railway.app'
pnpm exec tsx scripts/phase-f-smoke.ts
```

## Limitations

- Android E2E on device: confirm after deploy (report MANUAL_PENDING if not run)
- Presence still MemoryStore
- Venue search still MockVenueSearchAdapter
- Coin accounting deferred
