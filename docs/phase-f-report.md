# JJOIN Phase F Report

Real Data Vertical Slice — A create → B discover/apply → A approve → My Joins (PostgreSQL).

See: [`docs/phase-f-real-data-vertical-slice.md`](./phase-f-real-data-vertical-slice.md)

## Infrastructure

- Railway API: ONLINE (`https://api-production-2d67e.up.railway.app`)
- PostgreSQL: ONLINE / connected
- GitHub auto deploy: ENABLED (`main` → SUCCESS)
- health: `status=ok`, `database=connected`, `env=production`

## Preflight

- mobile typecheck: **PASS**
- ExternalLink fix: **PASS** (`Href` contract)

## DEV Users

- DEV_A: nickname 김진우 / `providerSubject=dev-persona-a`
- DEV_B: nickname 박민수 / `providerSubject=dev-persona-b`
- stable DB identity: **PASS** (smoke re-login same userId)
- session: signed HMAC token (redeploy-safe) + Me lazy hydrate

## Venue

- provider: `MOCK` + fixture `providerPlaceId`
- DB upsert: **PASS**
- duplicate protection: `@@unique([provider, providerPlaceId])`

## Join Create

- API: `POST /joins` (currentUser = host)
- DB: Join + Host participant
- Host participant: role HOST / APPROVED
- duration: domain `estimateEndAt` (60m × planned)
- status: OPEN

## Explore

- Venue source: Mock fixtures (unchanged Map UX)
- openJoinCount: from PostgreSQL
- join previews: from PostgreSQL
- hardcoded join data removed: **YES**

## Apply

- DEV_B: APPLIED
- status: APPLIED
- duplicate protection: unique + ConflictException

## Approve

- DEV_A authorization: host-only
- participant status: APPROVED
- confirmed player count: recomputed
- FULL transition: domain helper ready (smoke at 2/4 stayed OPEN)

## My Joins

- Host: `/joins/mine` hosted
- Participant: participating
- status synchronization: smoke verified A approve → B APPROVED

## Coin

- accounting: **COIN_ACCOUNTING_PENDING** (no ledger / no debit)
- POLICY_TBD preserved: **YES**

## Security

- auth: mock guarded; currentUser from token (no client hostUserId)
- private DTO: public profile deny-list tests PASS
- secrets: not committed

## Tests

- domain: **PASS** (duration + confirmed/FULL)
- API smoke (Railway): **PASS** (`scripts/phase-f-smoke.ts`)
- privacy: deny-list test PASS
- mobile typecheck: **PASS**
- API build: **PASS**

## Railway Deploy

- main push: `4c16bf9`
- auto deploy: **SUCCESS**
- health: **PASS**
- database: **connected**

## Android E2E

- A create: API smoke PASS / device **MANUAL_PENDING**
- B discover: API explore merge ready / device **MANUAL_PENDING**
- B apply: smoke PASS / device **MANUAL_PENDING**
- A approve: smoke PASS / device **MANUAL_PENDING**
- B sees approved: smoke PASS / device **MANUAL_PENDING**

## Remaining

- Coin Hold / Settlement
- Presence DB runtime
- Actual Venue Provider
- Actual OAuth / Identity Provider
- Android one-device two-persona UI walkthrough (user device)

## Result

**PASS** (API + Railway PostgreSQL vertical slice verified by smoke)

Android native UI walkthrough: **MANUAL_PENDING** (Gate A map regression not re-run in this session; Map code paths untouched except join preview navigation).
