# Phase H — NAVER Map + Kakao Local Live Venue Search

## Goal

NAVER Map remains the renderer. Kakao Local REST keyword search supplies **live** screen-golf venues for the current map viewport. JJOIN Join / Presence stay on Railway PostgreSQL.

## Architecture

```
ExploreMapScreen
   │
   ├─ NaverMapAdapter          (map only — no Kakao HTTP)
   │
   └─ GET /explore/map
          │
          ├─ VenueSearchProvider
          │     ├─ KakaoLocalVenueSearchAdapter   (production)
          │     └─ MockVenueSearchAdapter         (local without key)
          ├─ PresenceService                      (Phase G)
          └─ JoinsService.listOpenJoinVenuesNear  (TODAY_JOIN / Phase F)
```

MapProvider ≠ VenueSearchProvider.

## Kakao Local

- Endpoint: `GET https://dapi.kakao.com/v2/local/search/keyword.json`
- Auth: `Authorization: KakaoAK ${KAKAO_LOCAL_REST_API_KEY}` (server-only)
- Prefer `rect=west,south,east,north` from NAVER viewport
- Fallback: `x/y` + radius (≤ 20km, default config 5km)
- Paging: `size` from `KAKAO_LOCAL_PAGE_SIZE` (15), stop at `is_end` or `KAKAO_LOCAL_MAX_PAGES` (3)
- Dedupe by Kakao `id`

## Default query

`SCREEN_GOLF` → `스크린골프` via `defaultVenueSearchQuery` in `@jjoin/domain`.

## Persistence

**SEARCH ≠ PERSIST.** Kakao responses are never upserted into Prisma `Venue`, never cached long-term, never background-collected.

## Create Join

Kakao-live-only markers: `canCreateJoin=false` in Phase H. JJOIN-owned / mock venues can still create.

## Credentials / billing

Kakao Developers → app → **Kakao Map API** usage ON. Free quota may apply only to the first activated app per developer account (policy as of 2026). Paid use requires explicit user decision — never auto-enable billing.

## Compliance

Kakao place data shown on NAVER Map markers; `place_url` can open Kakao Map. Attribution/BI: use official assets/copy only when required. Ambiguous ToS → `COMPLIANCE_REVIEW_REQUIRED`.

## Future Venue Master (not this phase)

Franchise feeds, operator verification, commercial POI, Kakao licensed data contracts, stable JJOIN Venue identity for Create.
