# JJOIN Phase H Report

## Architecture
- Map: NAVER Native Map (`NaverMapAdapter`)
- Venue Search: `VenueSearchProvider` → Kakao Local / Mock
- Join: Railway PostgreSQL (Phase F; TODAY_JOIN via JJOIN venues)
- Presence: Railway PostgreSQL (Phase G)

## Kakao
- REST API: keyword search endpoint wired
- API enabled: **USER_ACTION_REQUIRED** (Developers Console에서 Kakao Map API ON 필요)
- free quota eligibility: **USER_ACTION_REQUIRED** (계정 첫 활성화 앱 여부 확인)
- billing: 자동 활성화 안 함
- credential: repo/Railway에 REST key **없음** (조사 완료)
- server-only: `KAKAO_LOCAL_REST_API_KEY` / never `EXPO_PUBLIC_*`

## Provider
- VenueSearchProvider: yes
- Kakao adapter: `KakaoLocalVenueSearchAdapter`
- Mock adapter: `MockVenueSearchAdapter`
- production adapter: `VENUE_PROVIDER_MODE=kakao` + key 설정 시 (현재 미설정 → mock)

## Search
- default query: `스크린골프`
- initial search: Explore load with viewport bounds
- rect: preferred
- fallback radius: `KAKAO_LOCAL_FALLBACK_RADIUS_M` (default 5000, cap 20000)
- page size: 15
- max pages: 3
- dedupe: Kakao `id`

## Live Venue
- result count: pending Kakao credential
- real business names: pending
- coordinate / phone / place URL: adapter normalize ready

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
- **MANUAL_PENDING / blocked** until Kakao REST key + Map API activation on Railway

## Railway
- code ready for auto deploy
- Kakao production smoke: blocked on credential

## User Action Required
1. [Kakao Developers](https://developers.kakao.com) → 내 애플리케이션 → JJOIN(또는 사용할 앱) 선택/생성
2. **Kakao Map** → 이용 설정 → **ON**
3. 앱 키가 **무료 쿼터 대상(계정 첫 활성화 앱)** 인지 확인. 아니면 Biz Wallet/유료 여부를 **직접 결정** (자동 결제 금지)
4. REST API 키 확인
5. Railway `api` 서비스 Variables에만 설정:
   - `KAKAO_LOCAL_REST_API_KEY=<secret>`
   - `VENUE_PROVIDER_MODE=kakao`
6. 값/키를 채팅에 붙여 넣지 말 것. 설정 후 이 세션에 “설정 완료”만 알려 주면 이어서 Production smoke + Android E2E 진행.

## Remaining
- Kakao credential + Android live E2E
- Persistent Venue Master / Kakao→JJOIN identity
- Coin / OAuth / Identity / PostGIS

## Result
**USER_ACTION_REQUIRED**
