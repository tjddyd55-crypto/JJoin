# Phase F Android E2E Report

실기기 + Railway API + PostgreSQL Manual E2E.

## Device
- adb: `R3KL202KGHF` (SM_S931N) device
- package: `com.jjoin.app`
- Development Build: existing Dev Client (no re-prebuild)

## Remote Environment
- API URL: `https://api-production-2d67e.up.railway.app`
- Railway health: `status=ok`, `database=connected`, `env=production`
- database: connected

## DEV_A
- login: **PASS** (UI — 김진우; initial NETWORK to localhost fixed by Railway API URL + Metro reload)
- create: **PASS** (user confirmed `A create 완료`)
- joinId: verified via `/joins/mine` + detail (prefix only in logs)
- DB status: OPEN (or FULL if filled); Host participant APPROVED

## DEV_B
- login: **PASS** (user confirmed flow)
- discover: **PASS** (Explore DB merge — `metadata.source=live`)
- apply: **PASS** (user confirmed `B apply 완료`)
- DB participation: APPLIED → later APPROVED

## DEV_A Approval
- host view: **PASS** (user confirmed)
- approve: **PASS** (user confirmed `A approve 완료`)
- confirmed count: increased (server verify — B APPROVED on hosted join)

## DEV_B Final
- My Joins: **PASS** (user confirmed `B approved 확인`)
- approved state: `myParticipationStatus=APPROVED` on participating list (server verify)

## Map Regression
- NAVER Map: not re-broken by this E2E (no native config change); user did not report map failure during Explore
- Venue Marker / Bottom Sheet: used for discover — **PASS** (user completed discover via Explore)

## Result
**PASS**

Notes:
- Early login failure was NETWORK (`127.0.0.1:3000`); fixed by Railway `EXPO_PUBLIC_API_URL` + Metro restart.
- Coin accounting still pending; OAuth / Venue Provider not in scope.
