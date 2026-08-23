# JJOIN White Screen Recovery Report

Date: 2026-08-23

## Root Cause

- **first fatal error:** `Cannot find native module 'ExpoPushTokenManager'` / `ExpoDevice`
- **file/module:** `app/_layout.tsx` → `use-push-registration` → `push-registration` (sync native imports on module load)
- **why white screen:** Root layout synchronously imported push stack before first render. When Dev Client binary lacked (or Metro served stale bundle with) push native modules, module evaluation threw during `_layout` load → React tree never mounted → white screen.

Historical Metro evidence (`terminals/540512.txt`):

```
ERROR Cannot find native module 'ExpoPushTokenManager'
Code: use-push-registration.ts:3 import * as Notifications from 'expo-notifications'
Call Stack: <global> (app/_layout.tsx:9)
```

Additional contributor: Metro ran with **`CI=true`** (reloads disabled) → stale bundle served after lazy-load fix landed.

FCM / Firebase **not** root cause.

## Metro

| Item | Status |
|------|--------|
| 8081 | restarted with `--clear`, `CI` unset |
| adb reverse | device **not connected** at recovery time |
| bundle | cache cleared, Metro waiting |
| runtime | pending device reconnect |

## Native

| Module | Notes |
|--------|-------|
| expo-notifications | lazy-loaded; must not block boot |
| expo-device | was sync import → now lazy |
| Kakao / Naver / Google / Map | unaffected by fix; worked in prior logs when app booted |

## Push Isolation

| Case | Behavior |
|------|----------|
| projectId missing | warn + skip (non-fatal) |
| FCM missing | skip token (non-fatal) |
| root render impact | **removed** — push host lazy + routing split |

## Fix

| File | Change |
|------|--------|
| `app/_layout.tsx` | `React.lazy` + `Suspense` for push host |
| `PushRegistrationHost.tsx` | new — isolated hook mount |
| `push-registration.ts` | lazy `expo-device` + lazy `expo-notifications` |
| `push-routing.ts` | pure route resolver (no native imports) |
| `app/my/notifications.tsx` | import routing only |

## Android Verification

| Check | Status |
|-------|--------|
| boot | **pending** — USB device offline |
| login screen | pending |
| Kakao / Naver / Google / Map | pending |

Reconnect `R3KL202KGHF` → `adb reverse tcp:8081 tcp:8081` → relaunch dev client.

## Firebase Status

- service account policy: unchanged (org policy blocked)
- FCM: not configured
- USER_ACTION_REQUIRED: Firebase SA key + FCM (after boot PASS)

## Result

**PENDING_DEVICE_VERIFY** — fix applied; full `PASS_BOOT_RECOVERY` requires on-device UI confirmation.
