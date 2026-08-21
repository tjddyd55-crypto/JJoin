# Phase I — Kakao Map Migration

## Migration reason

Explore map stack was split:

- Map = NAVER Native
- Venue Search = Kakao Local REST

Phase I unifies the **map provider** with Kakao Map Android SDK so viewport bounds feed Kakao Local `rect` naturally. This is a **MapProvider migration only** — Join / Presence / Privacy / Kakao Local search logic stay unchanged.

## Before / After

| Layer | Before (Phase H) | After (Phase I) |
|-------|------------------|-----------------|
| Map | NAVER Native (`NaverMapAdapter`) | Kakao Map Android SDK (`KakaoMapAdapter`) |
| Venue Search | Kakao Local REST | Kakao Local REST (unchanged) |
| Join | Railway PostgreSQL | unchanged |
| Presence | Railway PostgreSQL | unchanged |
| Package | `com.jjoin.app` | `com.jjoin.app` |

## Provider architecture

```
ExploreMapScreen
  ├─ KakaoMapAdapter          (map only — Native App Key)
  │    └─ jjoin-kakao-map     (local Expo Module → Kakao Maps SDK v2)
  ├─ MapChrome / BottomSheet  (unchanged)
  └─ fetchExploreMap          → Railway Explore → Kakao Local VenueSearch
```

`MapProvider ≠ VenueSearchProvider`.

SDK-specific types stay inside adapters. Screen uses `MapCameraHandle`, `MapBounds`, `MapCoordinate`.

### RN / Expo integration choice

Ecosystem survey (2026):

1. `@react-native-kakao/map` — npm name exists but monorepo has **no `packages/map`** (points at navi). Not a maintained MapView+markers solution.
2. `@jiggag/react-native-kakao-maps` — last publish ~2023, not suitable.
3. WebView Kakao Map JS — rejected as default (native interaction / Gate K performance).

**Decision:** local Expo Module `apps/mobile/modules/jjoin-kakao-map` wrapping official **Kakao Maps SDK v2** (`com.kakao.maps.open:android:2.15.1`).

## Kakao Native key vs REST key

| Key | Where | Purpose |
|-----|-------|---------|
| **Native App Key** | Mobile build (`EXPO_PUBLIC_KAKAO_MAP_NATIVE_APP_KEY` → Android strings + `KakaoMapSdk.init`) | Map SDK auth |
| **REST API Key** | Railway only (`KAKAO_LOCAL_REST_API_KEY`) | Kakao Local venue search |
| Admin Key | never | — |

Do **not** put REST API Key into the mobile Map SDK.

## Bounds

Kakao Map camera end event exposes viewport:

`west, south, east, north` (x = longitude, y = latitude)

Explore updates `searchRegion` from those bounds → `fetchExploreMap` → Kakao Local `rect`.

Camera move mid-gesture does **not** call Explore API. `이 지역 재검색` CTA remains.

## Markers

| Kind | Source | Notes |
|------|--------|-------|
| Venue | Kakao Local results | open-join badge only when JJOIN-owned rules allow |
| User | Postgres Presence `displayLat/Lng` | never raw GPS for others |
| Me | Expo foreground location | distinct from Presence markers |

Events: `onVenuePress(id)` / `onUserPress(id)`.

## Temporary provider switch

```
EXPO_PUBLIC_MAP_PROVIDER=kakao   # default / production
EXPO_PUBLIC_MAP_PROVIDER=naver   # temporary rollback only
```

After Gate K PASS, remove Naver RN dependency, Maven, manifest metadata, and env.

## Gate K (Android)

1. Kakao Map load  
2. Pan  
3. Pinch Zoom  
4. Current Location  
5. Kakao Venue Marker  
6. Presence User Marker  
7. Venue Marker select  
8. User Marker select  
9. Venue Bottom Sheet  
10. User Bottom Sheet  
11. Map moved → Re-search CTA  
12. Re-search  
13. CTA hidden  
14–17. Filters (골프장 / 사람 / 전체 / 오늘 조인)  
18. Search  
19. Bottom sheet gesture conflict none  
20. Bottom navigation OK  

## NAVER cleanup

- Code path: `NaverMapAdapter` kept only while `MAP_PROVIDER=naver` rollback exists.
- After Gate K PASS: remove `@mj-studio/react-native-naver-map`, Naver Maven, `EXPO_PUBLIC_NAVER_MAP_CLIENT_ID`.
- **Do not** delete Naver Cloud Console app during rollback window.

## Rollback note

1. Set `EXPO_PUBLIC_MAP_PROVIDER=naver` + Naver Client ID  
2. Rebuild Dev Client  
3. Explore falls back to `NaverMapAdapter`  

Kakao Local / Join / Presence remain on Railway regardless of map provider.
