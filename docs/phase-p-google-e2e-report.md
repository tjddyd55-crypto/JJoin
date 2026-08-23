# Phase P — Google Android E2E Report

Date: 2026-08-23  
Device: R3KL202KGHF (SM_S931N)  
API: `https://api-production-2d67e.up.railway.app`  
SOCIAL_AUTH_MODE: hybrid

## Env presence (values not recorded)

| Check | Result |
|-------|--------|
| mobile `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | present |
| Railway `GOOGLE_OAUTH_CLIENT_ID` | present |
| mobile ↔ Railway same Web Client ID | true |
| GET /health | 200 |

## Android E2E

| Step | Result |
|------|--------|
| prebuild --clean + run:android | PASS |
| Google Sign-In hub / account picker | PASS |
| ID token → `/auth/social/exchange` | PASS |
| Onboarding / profile route | PASS |
| Account `GOOGLE CONNECTED` | PASS |
| Session persistence (force-stop → home greeting) | PASS |
| Returning Google login (same SocialAccount) | PASS |
| Cancel (account picker back) | PARTIAL — Google one-tap auto-completes; `SIGN_IN_CANCELLED` handler present |

## Identity gate (actual Google user)

| Action | Result |
|--------|--------|
| Explore / map | PASS |
| Create join | PASS — “본인확인이 필요합니다” |
| Apply / Presence / Coin | covered by hybrid smoke |

## Server

| Check | Result |
|-------|--------|
| malformed / invalid ID token | 401 PASS |
| JWT-shaped garbage | 401 PASS |
| mock duplicate exchange same user | PASS |
| audience fail-closed when `GOOGLE_OAUTH_CLIENT_ID` set | code + deploy PASS |
| issuer allowlist | code PASS |

## Regression

| Area | Result |
|------|--------|
| Kakao Login | PASS (`KAKAO CONNECTED`) |
| Naver Login | PASS (`NAVER CONNECTED`) |
| Kakao Map explore | PASS (venues, sheet, filters, location) |
| F / G / H / J / K / L / M / N / O server smoke | PASS |

## Security

- ID token not persisted in DB
- No token logging observed
- No client secret on mobile
- Web Client ID only for audience

## Result

**PASS**
