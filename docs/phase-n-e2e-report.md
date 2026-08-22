# Phase N — Android E2E Report

**Date:** 2026-08-22  
**Device target:** R3KL202KGHF / `com.jjoin.app`  
**Result:** PARTIAL_PASS — code + server smoke PASS; provider console + device E2E USER_ACTION_REQUIRED

---

## Start Gate

| Check | Status |
|-------|--------|
| Phase M PASS | ✅ |
| Working tree | Phase N changes in progress |
| Railway health | ✅ (see server smoke) |
| Postgres | ✅ connected |
| Android adb | ⚠️ `adb` not in PATH on build host |
| Kakao Map regression post-SDK | ⚠️ pending native rebuild on device |

---

## Kakao

| Item | Status |
|------|--------|
| Console (Login Native App Key + key hash) | USER_ACTION_REQUIRED |
| Native SDK (`@react-native-seoul/kakao-login`) | ✅ integrated |
| Credential (access token → exchange) | ✅ contract |
| Server verify | ✅ adapter |
| Android NEW login | USER_ACTION_REQUIRED (console + rebuild) |
| RETURN | USER_ACTION_REQUIRED |
| CANCEL | ✅ code path (`SocialLoginCancelledError`) |
| INVALID token | ✅ server 401 in smoke |
| **Result** | **PARTIAL_PASS** |

---

## Naver

| Item | Status |
|------|--------|
| Console | USER_ACTION_REQUIRED |
| Native SDK | ✅ integrated |
| Server verify | ✅ adapter |
| E2E | USER_ACTION_REQUIRED |
| **Result** | **USER_ACTION_REQUIRED** |

---

## Google

| Item | Status |
|------|--------|
| Android + Web client IDs | USER_ACTION_REQUIRED |
| Native integration | ✅ integrated |
| Server verify (`GOOGLE_OAUTH_CLIENT_ID`) | ✅ adapter |
| E2E | USER_ACTION_REQUIRED |
| **Result** | **USER_ACTION_REQUIRED** |

---

## Database (expected after real Kakao E2E)

| Scenario | Expected |
|----------|----------|
| First Kakao login | User +1, SocialAccount(KAKAO) +1 |
| Same Kakao re-login | No duplicate User / SocialAccount |
| Cancel login | No User / SocialAccount / session |

Verified for **mock** path in Phase M smoke; real path pending console.

---

## Session

| Item | Status |
|------|--------|
| JJOIN token issued | ✅ (exchange + mock) |
| SecureStore | ✅ mobile implementation |
| Provider token not persisted as session | ✅ |
| Logout | ✅ existing flow |

---

## Onboarding

| Item | Status |
|------|--------|
| New user TERMS → … | ✅ Phase M smoke |
| Returning user | ✅ mock same-subject |
| Identity gate (real user) | ✅ UNAVAILABLE UX when no contract |

---

## Identity Production

| Item | Status |
|------|--------|
| Provider selected | None (USER decision) |
| Contract | USER_ACTION_REQUIRED |
| Adapter | Mock only; production real user blocked |
| **Result** | **USER_ACTION_REQUIRED** |

---

## Native Regression

| Item | Status |
|------|--------|
| Kakao Map | ⚠️ re-verify after `expo prebuild` + social SDK |
| Local / Presence / Join | ✅ Phase F–L regression scripts (server) |

---

## Manual E2E script (when console ready)

1. Set `apps/mobile/.env` login keys (Map key unchanged)
2. `pnpm exec expo prebuild -p android --clean`
3. `pnpm exec expo run:android --device`
4. Login → Kakao → consent → onboarding TERMS
5. Logout → Kakao again → same user (no duplicate)
6. Cancel Kakao → stay on login, no API user created
7. Repeat matrix for Naver / Google when configured

---

## USER_ACTION_REQUIRED

1. Kakao Developers: Login Native App Key + Android key hash for `com.jjoin.app`
2. Naver Developers: Login app + client credentials
3. Google Cloud: Android + Web OAuth clients; Railway `GOOGLE_OAUTH_CLIENT_ID`
4. Railway: set `SOCIAL_AUTH_MODE=hybrid` when enabling real tokens alongside smoke personas
5. NICE/KCB/PASS identity contract (Phase N.1)
6. Install Android platform tools / connect device for on-device E2E
