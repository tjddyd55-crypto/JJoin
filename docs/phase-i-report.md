# JJOIN Phase I Report

## Architecture
- Before: Map=NAVER Native, Venue Search=Kakao Local, Join/Presence=Railway PostgreSQL
- After: Map=Kakao Map Android SDK, Venue Search=Kakao Local, Join/Presence unchanged
- Map abstraction: `KakaoMapAdapter` + local Expo Module `jjoin-kakao-map`; screen uses `MapCameraHandle` / `MapBounds`

## Kakao Map
- SDK: Kakao Maps Android SDK v2 (`com.kakao.maps.open:android:2.15.1`)
- RN integration: local Expo Module `jjoin-kakao-map`
- Native key: `EXPO_PUBLIC_KAKAO_MAP_NATIVE_APP_KEY` → build-time strings + `KakaoMapSdk.init`
- package: `com.jjoin.app`
- debug key hash: `Xo8WBi6jzSxKDVR4drqm84yr9iU=`
- map load: PASS on device `R3KL202KGHF` (K3f labels; no MapAuth errors)

## Credentials
- Native App Key: mobile Map SDK only
- REST API Key: Railway `KAKAO_LOCAL_REST_API_KEY` only (Phase H)
- separation: REST key never injected into Map SDK

## Explore
- bounds / current location / venue+user markers / filters / re-search / search / bottom sheet: Gate K PASS (see `phase-i-final-report.md`)

## NAVER Cleanup
- Removed `@mj-studio/react-native-naver-map`, Naver Maven, `NaverMapAdapter`, related env flags
- Naver Cloud Console app: not deleted
- Social login NAVER: unchanged

## Regression
- See final report — F/G/H re-verified on Railway during Gate K session; typecheck PASS after cleanup

## Gate K Android
- Status: **PASS** (device + Kakao Map)

## Tests
- mobile typecheck: PASS
- API typecheck: PASS

## Result
**PASS** — details in `docs/phase-i-final-report.md`
