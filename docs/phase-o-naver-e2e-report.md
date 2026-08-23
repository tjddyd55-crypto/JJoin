# Phase O — Naver Android E2E Report

Date: 2026-08-23  
Device: R3KL202KGHF (SM_S931N)  
API: `https://api-production-2d67e.up.railway.app`  
SOCIAL_AUTH_MODE: hybrid

## Env presence (values not recorded)

| Check | Result |
|-------|--------|
| mobileClientIdPresent | true |
| mobileClientSecretPresent | true |
| urlSchemePresent | true (`jjoinnaverlogin`) |
| Railway NAVER_CLIENT_* | not used by API code |
| GET /health | 200 |

## Android E2E

| Step | Result |
|------|--------|
| prebuild --clean + run:android | PASS |
| Naver OAuth WebView opens | PASS |
| Consent + callback (`NidOAuthBridgeActivity`) | PASS |
| POST /auth/social/exchange | PASS (onboarding route reached) |
| Account screen NAVER CONNECTED | PASS |
| Session persistence (force-stop → no re-login) | PASS |
| Returning Naver login (same account) | PASS (NAVER CONNECTED, no duplicate onboarding) |
| Invalid token API | PASS (401 `naver_token_invalid`) |
| Cancel | PARTIAL — device Naver session auto-completes; cancel handler exists in code |

## Identity gate (actual Naver user)

| Action | Result |
|--------|--------|
| Explore / map | PASS |
| Create join | PASS — 본인확인 required UI |
| Server hybrid mock user capability | UNAVAILABLE (script) |

## Regression

| Area | Result |
|------|--------|
| Kakao login (after stale-cache fix) | PASS |
| Kakao Map explore | PASS |
| F / G / H / J / K / L / M / N smoke | PASS |
| landing HTTPS | 200 |
| api / settlement-cron | SUCCESS (unchanged) |

## Code changes

- `kakao-native-login.ts` + `SessionContext.tsx`: retry interactive Kakao login when cached token rejected (`kakao_token_invalid`).
- `scripts/phase-o-naver-e2e-server.ts`, `phase-o-naver-db-verify.ts`, `phase-o-naver-db-verify.cjs`.

## Result

**PASS**

NAVER Developers Android download URL (unchanged):  
`https://landing-production-0d39.up.railway.app`

Package: `com.jjoin.app`
