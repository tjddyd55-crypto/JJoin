# JJOIN Phase R Native Push Recovery Report

Date: 2026-08-23  
Device: R3KL202KGHF (SM_S931N)  
Package: `com.jjoin.app`

## Root Cause
- expo-notifications JS: present (`^57.0.13`, Expo SDK ~57.0.15)
- installed APK native module (pre-rebuild): **missing** `ExpoPushTokenManager` / PushToken native code
- reason: Phase R added JS + config plugin, but Dev Client binary was built **before** native dependency inclusion; HMR cannot add native modules

## Version
- Expo SDK: ~57.0.15
- expo-notifications: ^57.0.13 (compatible; `expo install --check` only flags typescript)
- expo-constants / expo-device: present

## Config
- plugin: `expo-notifications` with `defaultChannel: jjoin-general` — present
- Android native after prebuild: `POST_NOTIFICATIONS`, FCM default channel meta, Kakao oauth scheme retained
- projectId: `EXPO_PUBLIC_EAS_PROJECT_ID` **unset**
- FCM / `google-services.json`: **absent**

## Rebuild
- prebuild: `expo prebuild -p android --clean` — PASS
- build: `gradlew app:installDebug` packaged APK (install first attempt failed: adb drop); `adb install -r app-debug.apk` — PASS
- device: R3KL202KGHF
- package: `com.jjoin.app` preserved
- app boot: PASS (`Running "main"`, Metro bundle OK)

## Native Module
- ExpoPushTokenManager crash: **gone** (no logcat hits after rebuild)
- previous crash: Cannot find native module `ExpoPushTokenManager`
- current result: Dev Client boots + loads JS without fatal

## Push Fail-safe
- projectId missing: skip token (warn only) — PASS
- FCM missing: expected until credentials — non-fatal
- app fatal: no
- Join/Auth/Map availability: not blocked by push init (lazy import)

## Regression (smoke after rebuild)
- Kakao / Naver / Google / Map / Venue / Join: **manual re-check recommended** on device (native keys preserved in prebuild: Kakao AuthCodeHandler + map plugin maven repos)
- Notification Center route: present (`/my/notifications`)
- Autolink includes `expo.modules.notifications.tokens.PushTokenModule`

## EAS
- existing project / eas.json: **none**
- projectId: unset
- action needed: create Expo project / set `EXPO_PUBLIC_EAS_PROJECT_ID` (or `extra.eas.projectId`)

## Firebase / FCM
- Firebase Android app for `com.jjoin.app`: not in repo
- google-services.json: missing
- FCM V1 + EAS credentials: missing
- action needed: Firebase Console + EAS Credentials upload (do **not** confuse with Google Sign-In OAuth client)

## Git
- changes: lazy-load push registration; android regenerated via prebuild (local)
- commit: `fix: lazy-load expo-notifications to survive stale Dev Client`
- push: main
- clean: Phase R recovery files committed (unrelated landing noise may remain)

## Result
**PASS_NATIVE_RECOVERY** + **USER_ACTION_REQUIRED** (EAS projectId + FCM)

### USER_ACTION_REQUIRED (exact)
1. Expo: create/link EAS project for slug `jjoin` → set `EXPO_PUBLIC_EAS_PROJECT_ID`
2. Firebase: add Android app `com.jjoin.app` → download `google-services.json` (do not commit secrets in chat)
3. EAS Credentials: upload FCM V1 service account for Android
4. Rebuild Dev Client once credentials are present
5. Then re-run Phase R Android tray E2E (Apply / Approve / Reward)

**STOP** — no NICE / Coin Purchase / PG / IAP.
