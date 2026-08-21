# Explore Map + Nearby User Presence (Figma Phase)

Figma: https://www.figma.com/design/sL62yQIhgY1l0WUcksWuPo  
Status: **Explore Map UX APPROVED · PHASE D Production in progress**

See also: [naver-map-integration.md](./naver-map-integration.md), [location-presence.md](./location-presence.md), [phase-d-report.md](./phase-d-report.md)


## Final UX Polish
- Venue pin (시설) ≠ User avatar presence · Selected 각각 정의
- 「이 지역 재검색」: 기본 hidden · MapMoved만 표시 · 재검색 후 hidden
- Sheet PEEK: Venue1 + Venue2 일부 peek
- Current Location FAB touch target 48×48
- Filter: 전체 / 골프장 / 사람 / **오늘 조인**
- 추가 Figma 수정 중단

## Concept

Explore = Map-first discovery of:

1. **VENUE** (스크린골프장 Marker ⛳ + open Join count)
2. **JOIN** (Venue에 종속 — Join마다 별도 GPS Marker 금지)
3. **USER PRESENCE** (opt-in “지금 조인 가능”만 · exact GPS 비공개)

NAVER Map UX pattern reference only — no pixel/logo copy.

## Screens (new / renamed)

| Frame | Role |
|-------|------|
| EXPLORE_01_Map | Core map + search + filters + markers + sheet peek + presence OFF |
| ZZ_LEGACY_EXPLORE_01_Map | 이전 단순 map (prototype SSOT 제외) |
| EXPLORE_VenueSelected | Selected venue + join previews + create |
| EXPLORE_UserSelected | Privacy-safe user preview |
| EXPLORE_MapMoved_ReSearch | Camera moved → explicit re-search |
| EXPLORE_PresencePrivacyConfirm | First ON confirm |
| EXPLORE_PresenceDuration | 1h / 2h / 오늘 (POLICY_TBD) |
| EXPLORE_PresenceActive | ON + remaining time |
| EXPLORE_02_List / EXPLORE_03_LocationSearch | 기존 유지 · Map과 연결 |

## Prototype START

`04_Prototype` → `PROTO_PLAYBOOK_ExploreMap`  
Start frame: **EXPLORE_01_Map** (`34:2`)

| Flow | Path |
|------|------|
| MAP-A | Map → Venue card → VenueSelected → Join → JOIN_01 |
| MAP-B | User marker → UserSelected → PublicProfile |
| MAP-C | VenueSelected → Create |
| MAP-D | Map(카메라 이동) → MapMoved(재검색 표시) → Map(재검색 후 hidden) |
| MAP-E | Search → LocationSearch(거제) → Map |
| MAP-F | Presence OFF → Privacy → Duration → Active |

Reactions wired: **22** (button/marker level)

## Privacy (product rules locked for later build)

- Exact lat/lng never in public DTO
- Presence opt-in ≠ OS location permission
- Approx distance / “고현동 주변” only
- No continuous tracking / no location history in MVP docs

## Production

**NOT STARTED.** Await explicit user approval (“진행”, “개발하자”, “괜찮다”).
