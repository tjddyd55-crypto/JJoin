# Phase Q E2E Report — Venue Activation

Date: 2026-08-23  
API: `https://api-production-2d67e.up.railway.app`

## Server smoke (`scripts/phase-q-venue-activation-smoke.ts`)

| Check | Result |
|-------|--------|
| Explore Kakao/MOCK canCreateJoin=true | pending deploy |
| Activate new venue | pending deploy |
| Activate idempotent | pending deploy |
| Concurrent activate same place | pending deploy |
| Invalid providerPlaceId non-500 | pending deploy |
| Unauthorized 401 | pending deploy |
| Explore merge jjoinVenueId | pending deploy |

## Android (R3KL202KGHF) — after deploy

| Step | Result |
|------|--------|
| Explore real Kakao venue | pending |
| Sheet CTA「여기서 조인 만들기」 | pending |
| Activate → Create | pending |
| Coin preview | pending |
| Join create | pending |
| openJoinCount / badge | pending |
| Returning activate (no dup) | pending |
| DEV_B discover/apply | pending |
| Identity gate (real social) | pending |
| Map / Kakao / Naver / Google regression | pending |
| F~P smoke | pending |

## Result

**IN_PROGRESS** — code landed; awaiting Railway deploy + device E2E.
