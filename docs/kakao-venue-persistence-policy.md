# Kakao Local — Venue Persistence Policy (Phase Q)

## Official guidance (re-checked 2026-08-23)

Kakao DevTalk (Local API FAQ / place-storage thread):

- Local API responses are for **live call use**.
- **Allowed to store:** Kakao **place ID**, **place URL**.
- **Not allowed to store/reuse from Kakao response:** place name, address, phone, coordinates, and other response fields (live-call only).
- Bulk crawling / building a Kakao place database from search results is **forbidden**.

Sources:

- [FAQ — 카카오맵 API](https://devtalk.kakao.com/t/faq-api/125610)
- [Local API 사용자 선택 장소 저장 범위](https://devtalk.kakao.com/t/local-api/149619)

## JJOIN product need

Join requires a durable `Venue` row (`provider` + `providerPlaceId` unique) so that:

- Create / Apply / Presence / Settlement attach to a stable FK
- Explore can merge `openJoinCount` onto Kakao live hits by place id
- Historical joins survive if Kakao later stops resolving the place

## What we store (user-selected activation only)

Activation happens **only** when an authenticated user taps **「여기서 조인 만들기」**.

| Field | Source | Rationale |
|-------|--------|-----------|
| `provider` | `KAKAO` | Provider-neutral key |
| `providerPlaceId` | Kakao `id` (server-resolved) | Officially allowed |
| `metadata.placeUrl` | Kakao `place_url` (server-resolved) | Officially allowed |
| `metadata.status` | `ACTIVE` / `UNAVAILABLE` | JJOIN lifecycle, not Kakao |
| `metadata.activatedAt` | server clock | Audit |
| `name`, `address`, `roadAddress`, `latitude`, `longitude` | **User-confirmed operational snapshot** at activation, after server-side Kakao resolve | Required for Join FK / map / history. **Not** a Kakao search cache. **Not** refreshed from background crawl. |

**Never stored:**

- Raw Kakao HTTP JSON / full payload dump in `metadata`
- Phone from Kakao (minimize retained surface)
- Search result lists / keyword histories
- Places the user never selected

## What we do not do

- No background crawler of Kakao Local
- No bulk “import all golf venues in Korea”
- No using stored Kakao fields as a substitute for live Explore search
- Explore markers for Kakao-only places still come from **live** Local search

## Server resolve (anti-spoof)

`POST /venues/activate` accepts `provider` + `providerPlaceId` (+ resolve hint).  
Server re-queries Kakao Local and **must** find the same `providerPlaceId`.  
Client-supplied name/coords are **not** trusted as identity.

## Compliance note

Strict reading of DevTalk allows only place ID + URL.  
Operational name/coords are retained solely as **JJOIN service snapshot after explicit user activation** for Join integrity.  
Commercial scale / partnership may require Kakao contract review (`COMPLIANCE_REVIEW_REQUIRED` if product counsel disagrees).

## Explore merge

Live Kakao hits remain ephemeral.  
Batch DB lookup by `(provider=KAKAO, providerPlaceId IN (...))` attaches `jjoinVenueId` / `openJoinCount` without writing search results.
