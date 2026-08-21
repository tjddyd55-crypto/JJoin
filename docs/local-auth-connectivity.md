# Local Auth Connectivity Report

**Railway: NOT_CONFIGURED — intentional**  
**Date:** 2026-08-21

## Root Cause

| Item | Finding |
|------|---------|
| API running | **YES** (`GET /health` → ok) |
| API port | **3000** (`API_PORT` default / listen) |
| Mobile API URL type | **localhost/127.0.0.1:3000** (local, not Railway) |
| Failure | **NETWORK** — Android device could not reach PC API (ADB reverse not mapped when login failed; PC API itself is healthy) |
| Auth logic | **OK** on PC (`POST /auth/social/mock-sign-in` → 201, `RETURNING_USER` → `HOME`) |

로그인 UI 버그가 아니라 **실기기 ↔ PC Local Nest API 연결** 문제.

## Local API

| Check | Result |
|-------|--------|
| health | **PASS** `{ status: ok, service: jjoin-api }` |
| mock-sign-in | **PASS** HTTP 201, token issued, nextStep=HOME (RETURNING_USER) |

## Mobile ENV

| Item | Result |
|------|--------|
| `EXPO_PUBLIC_API_URL` | Set to `http://127.0.0.1:3000` (local .env, gitignored) |
| Scheme | http |
| Cleartext (debug) | Already enabled in `android/app/src/debug` |
| Client Secret | unused |

## ADB

| Item | Result (this agent session) |
|------|-----------------------------|
| device | **NONE** at verification time (`adb devices` empty) |
| reverse mapping | **NOT_SET** — requires connected device |

Helper script added:

`scripts/android-adb-reverse-api.ps1`

```powershell
pwsh -File scripts/android-adb-reverse-api.ps1
# expects: tcp:3000 tcp:3000
```

## Code changes (minimal)

- Dev login logs: NETWORK vs HTTP vs OTHER (no secrets / no raw URL dump to UI)
- `api-client`: wrap `fetch` → `network_error:` prefix for connectivity failures
- `.env.example`: `http://127.0.0.1:3000`
- ADB reverse helper script

## Android Login / Gate A

| Item | Status |
|------|--------|
| Mock login on device | **MANUAL_PENDING** (device not visible to agent ADB) |
| Auth transition / Home | MANUAL_PENDING |
| Explore / Naver Map Gate A | MANUAL_PENDING (blocked on login connectivity) |

## Railway

**NOT_CONFIGURED — intentional**

## Remaining — user steps (USB 재연결 후)

1. USB 디버깅 기기가 `adb devices`에 `device`로 보이는지 확인  
2. `pwsh -File scripts/android-adb-reverse-api.ps1`  
3. PC에서 API 유지: `pnpm --filter @jjoin/api start:dev`  
4. Metro: `cd apps/mobile && pnpm exec expo start --dev-client` (env 반영을 위해 재시작)  
5. 앱에서 DEV scenario **RETURNING** 선택 → 카카오 Mock 로그인  
6. Home → 탐색 → Gate A 체크리스트  

Native rebuild는 API URL 변경만으로는 불필요 (JS env + cleartext debug 이미 존재).
