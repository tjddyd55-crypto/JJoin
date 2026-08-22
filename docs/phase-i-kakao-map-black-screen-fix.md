# Kakao Map Black Screen Fix Report (Phase I.1)

## Symptom
- Kakao Local venue search / filters / Venue sheet: PASS
- Native MapView area present, but base map was black (no roads/buildings/labels/tiles)
- Earlier Phase I “PASS” was **incorrect** — Local API success ≠ Map SDK rendering success

## Evidence (before fix)
- Auth HTTP 200 to Kakao vector auth (`package=com.jjoin.app`, key hash matches debug cert)
- Labels API could run (`K3fAApi` Label) while SurfaceFlinger only showed solid SurfaceView background
- Accessibility: internal `SurfaceView` bounds `0x0` / `visible=false` under ExpoView
- `MapView.start()` ran from view `init` before attach/layout
- Calling `mapView.isStarted` / `setFinishManually` before start → `NullPointerException` on null `IMapSurfaceView` and aborted ready path (`onMapReady` never fired after auth 200)

## Root Cause
**Primary:** Kakao `MapView` was started and lifecycle-probed before its GL `SurfaceView` existed / had non-zero size under React Native Fabric + ExpoView (`LinearLayout`).

Contributing factors:
1. `start()` in constructor (size 0)
2. ExpoView did not force Android child measure/layout (`shouldUseAndroidLayout` + explicit `onMeasure`/`onLayout`)
3. Unsafe `mapView.isStarted` / `setFinishManually` before start → NPE, engine never reached `onMapReady` despite auth 200
4. Activity resume/pause must wait until `onMapReady`

Authentication (Native App Key / package / debug key hash) was **not** the blocker — vector auth returned 200.

## Fix
Files:
- `apps/mobile/modules/jjoin-kakao-map/android/.../JjoinKakaoMapView.kt`
- `apps/mobile/src/features/explore/map/KakaoMapAdapter.tsx` (transparent style + ready/error logs)
- `apps/mobile/src/features/explore/screens/ExploreMapScreen.tsx` (transparent `mapArea`)

Changes:
- Defer `MapView.start()` until attached + view/map size > 0
- `shouldUseAndroidLayout=true`, override `onMeasure`/`onLayout`, force MapView fill (LinearLayout weight)
- Guard lifecycle with `mapReady` flag; never call `isStarted` before ready
- `setFinishManually(true)` only after `onMapReady`
- Post-start re-layout so SurfaceView gets 1080×2085 before GL ready
- Bitmap marker icons (avoid text-only `ImageAsset is invalid`)

Native rebuild: `assembleDebug` + `adb install -r`

## Android Visual QA (R3KL202KGHF / SM_S931N)
Evidence screenshot: `docs/phase-i-kakao-map-visual-qa.png`

| Check | Result |
|-------|--------|
| roads | PASS |
| buildings / urban fill | PASS |
| place labels (지명) | PASS (e.g. 고현버스터미널) |
| base tiles / colors | PASS (not black; water/green/road visible) |
| pan | PASS (re-search CTA) |
| venue markers | PASS |
| sheets / filters / nav | PASS |

Log after fix: `onMapReady` · `Engine state : running` · `surface=1080x2085` · `vulkan=false`

## Authentication (no secret values)
- Native key injected: YES (length 32, non-placeholder)
- package: `com.jjoin.app`
- installed APK SHA-1 → Kakao key hash: `Xo8WBi6jzSxKDVR4drqm84yr9iU=` (matches debug.keystore)
- SDK init: `KakaoMapSdk.init` in `MainApplication.onCreate`
- vector auth: HTTP 200

## Regression
- Phase F smoke: SMOKE_PASS
- Phase G smoke: SMOKE_PASS
- Phase H smoke: SMOKE_PASS (KAKAO_LOCAL)

## Tests
- mobile typecheck: PASS
- API typecheck: PASS
- Kotlin compile + assembleDebug: PASS

## Phase I status correction
- Prior `docs/phase-i-final-report.md` PASS is retracted for map rendering.
- Phase I.1 restores true Gate K visual PASS for Kakao base map.

## Result
**PASS**

Phase J not started — STOP.
