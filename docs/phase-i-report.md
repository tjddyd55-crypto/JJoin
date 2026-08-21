# JJOIN Phase I Report

## Architecture
- Before: Map=NAVER Native, Venue Search=Kakao Local, Join/Presence=Railway PostgreSQL
- After (target): Map=Kakao Map Android SDK, Venue Search=Kakao Local, Join/Presence unchanged
- Map abstraction: `KakaoMapAdapter` + local Expo Module `jjoin-kakao-map`; screen uses `MapCameraHandle` / `MapBounds`

## Kakao Map
- SDK: Kakao Maps Android SDK v2 (`com.kakao.maps.open:android:2.15.1`)
- RN integration: local Expo Module (no maintained RN MapView wrapper with markers found)
- Native key: `EXPO_PUBLIC_KAKAO_MAP_NATIVE_APP_KEY` → build-time strings + `KakaoMapSdk.init` (value not logged)
- package: `com.jjoin.app`
- key hash: USER_ACTION_REQUIRED — register debug/release key hash under Native App Key in Kakao Developers
- map load: blocked until Native App Key + key hash configured, then Dev Client rebuild

## Credentials
- Native App Key: mobile Map SDK only (configured via env → Android string resource)
- REST API Key: Railway `KAKAO_LOCAL_REST_API_KEY` only (unchanged from Phase H)
- separation: enforced in docs + config plugin (REST key never injected into Map SDK)
- mobile exposure: Native App Key via EXPO_PUBLIC for build injection only
- server exposure: REST key server-only

## Explore
- bounds: Kakao viewport west/south/east/north → `searchRegion` → Explore rect
- current location: Expo foreground + camera animate (custom "나" marker)
- venue marker: Kakao Local venues on Kakao Map labels
- user marker: Presence privacy display coordinates
- filters: unchanged (ALL / VENUE / USER / TODAY_JOIN)
- re-search: pan → CTA → bounds search (no API on every camera move)
- search: Phase H Kakao Local keywords unchanged
- bottom sheet: `@gorhom/bottom-sheet` unchanged

## NAVER Cleanup
- RN dependency: still present for temporary `MAP_PROVIDER=naver` rollback
- Maven: both Kakao + Naver repos during migration window
- manifest: Naver plugin still applied when Naver client id present
- env: `EXPO_PUBLIC_NAVER_MAP_CLIENT_ID` demoted to rollback-only in examples
- remaining NAVER runtime dependency: yes (rollback) — remove after Gate K PASS

## Regression
- Phase F: not re-run in this interim report (server unchanged)
- Phase G: not re-run in this interim report (server unchanged)
- Phase H: not re-run in this interim report (Kakao Local unchanged)

## Gate K Android
- Status: USER_ACTION_REQUIRED (Native App Key + key hash + Dev Build)
- Native module compile (`:jjoin-kakao-map:compileDebugKotlin`): PASS
- Map / Pan / Zoom / Current location / Markers / Sheets / Re-search / Filters / Search / Navigation: pending device after key setup

## Tests
- mobile typecheck: PASS
- map-geo unit (`node --experimental-strip-types --test`): PASS
- API typecheck: PASS (unchanged)
- Kakao Map Android module Kotlin compile: PASS

## Result
USER_ACTION_REQUIRED

### USER_ACTION_REQUIRED checklist
1. Kakao Developers (reuse Phase H app if possible): enable **Kakao Map**, confirm **Native App Key**
2. Register Android platform: package `com.jjoin.app`
3. Register **debug key hash** (and release when needed) under that Native App Key
4. Set `EXPO_PUBLIC_KAKAO_MAP_NATIVE_APP_KEY` in `apps/mobile/.env` (do not paste into chat)
5. Rebuild Dev Client: `pnpm --filter @jjoin/mobile exec expo prebuild -p android` then `expo run:android` on device `R3KL202KGHF`
6. Run Gate K 20 items → then remove Naver dependency (`chore: remove naver map native dependency`)

Temporary rollback (until Gate K PASS): `EXPO_PUBLIC_MAP_PROVIDER=naver` + existing Naver Client ID.

Do **not** send Native App Key / REST key / key hash values in chat.
