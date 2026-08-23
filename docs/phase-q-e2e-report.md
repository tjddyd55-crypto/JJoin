# Phase Q E2E Report — Venue Activation

Date: 2026-08-23  
Device: R3KL202KGHF (SM_S931N)  
API: `https://api-production-2d67e.up.railway.app`

## Server smoke

| Check | Result |
|-------|--------|
| Explore Kakao `canCreateJoin=true` | PASS |
| Activate new venue | PASS |
| Activate idempotent | PASS |
| Concurrent activate | PASS |
| Invalid providerPlaceId non-500 | PASS (404) |
| Unauthorized 401 | PASS |
| Explore merge `jjoinVenueId` | PASS |
| DEV_A activate + create + `openJoinCount` | PASS |

Script: `scripts/phase-q-venue-activation-smoke.ts`, `scripts/phase-q-dev-a-create-smoke.ts`

## Android E2E

| Step | Result |
|------|--------|
| Kakao Explore venues | PASS |
| Sheet CTA「여기서 조인 만들기」 | PASS |
| Real social UNVERIFIED → identity gate | PASS |
| DEV_A (김진우) login | PASS |
| Activate → Create screen + coin preview | PASS |
| Join create success | PASS |
| Create screen shows activated venue name | FIXED (follow-up commit) |

## Regression

| Area | Result |
|------|--------|
| Phase F join smoke | PASS |
| Phase H venue search | PASS |
| Phase J coin smoke | PASS |
| Phase P Google server | PASS |
| Map tiles/markers (visual on device) | PASS |

## Result

**PASS**
