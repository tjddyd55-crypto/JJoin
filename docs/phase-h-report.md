# JJOIN Phase H Report

## Architecture
- Map: NAVER Native Map (`NaverMapAdapter`)
- Venue Search: `VenueSearchProvider` → Kakao Local / Mock
- Join: Railway PostgreSQL (Phase F; TODAY_JOIN via JJOIN venues)
- Presence: Railway PostgreSQL (Phase G)

## Kakao
- REST API: keyword search endpoint wired
- API enabled: Production active
- free quota eligibility: user-managed (not auto-billed by Cursor)
- billing: unchanged by agent
- credential: Railway `KAKAO_LOCAL_REST_API_KEY` (redacted)
- server-only: PASS

## Provider
- VenueSearchProvider: yes
- Kakao adapter: `KakaoLocalVenueSearchAdapter`
- Mock adapter: `MockVenueSearchAdapter`
- production adapter: **kakao** (`VENUE_PROVIDER_MODE=kakao`)

## Search
- default query: `스크린골프`
- initial search: Explore load with viewport bounds
- rect: preferred for default keyword
- unscoped keyword: explicit queries (골프존 / SG골프 / 서울 스크린골프) skip rect+radius
- fallback radius: `KAKAO_LOCAL_FALLBACK_RADIUS_M` (default 5000, cap 20000)
- page size: 15
- max pages: 3
- dedupe: Kakao `id`

## Live Venue
- result count: 26 Geoje `스크린골프` (≤45)
- real business names: PASS (골프존파크 등)
- coordinate / phone / place URL: PASS

## Explore
- NAVER Map / Venue Marker / Sheet / filters / re-search: mobile wired
- 사람 filter: Presence unchanged
- 오늘 조인: JJOIN open-join venues (no Kakao name merge)
- Kakao Create Join: disabled (`canCreateJoin=false`)

## Persistence
- Kakao response DB saved: **no** (by design)
- Venue row delta from search: not written in Explore path
- background collection: none

## Security
- REST API Key mobile: absent
- REST API Key git: absent (`.env.example` key name only)
- production logs: count/status/duration only

## Regression
- Gate A: map UX preserved
- Phase F: smoke still applicable (joins unchanged)
- Phase G: presence module unchanged

## Android E2E
- initial screen golf / filters / re-search / keyword searches: **PASS**
- detail: `docs/phase-h-android-final-report.md`

## Railway
- main push: yes
- auto deploy: SUCCESS
- health: ok / connected
- Kakao production smoke: **PASS** (`source=KAKAO_LOCAL`)

## User Action Required
NONE

## Remaining
- Persistent Venue Master strategy
- Kakao Venue → JJOIN Venue identity strategy
- Coin Hold/Settlement
- Real OAuth
- Identity Verification
- PostGIS

## Result
**PASS**
