# JJOIN Phase G Report

## Infrastructure
- Railway: JJOIN project ONLINE
- Postgres: ONLINE
- GitHub auto deploy: ENABLED (`main` → api)
- health: `status=ok` `database=connected` `env=production`
- API: https://api-production-2d67e.up.railway.app

## Presence Store
- Memory adapter: `MemoryPresenceStore` (`PRESENCE_STORE=memory`, local only)
- Prisma adapter: `PrismaPresenceStore`
- Railway runtime: `PRESENCE_STORE=prisma`
- persistence after restart: **PASS** (redeploy 후 `GET /me/presence` still AVAILABLE)

## Presence API
- GET: `/me/presence` → `PrivatePresenceDto` (no exact GPS)
- PUT: `/me/presence` → duration preset → server `availableUntil`
- DELETE: `/me/presence` → HIDDEN
- currentUser authorization: MockAuthGuard + `@CurrentUserId` (body.userId 금지)

## Duration
- ONE_HOUR (`1h`): now + 1h
- TWO_HOURS (`2h`): now + 2h
- TODAY (`today`): Asia/Seoul calendar day end
- timezone: `DEFAULT_TIMEZONE` (default Asia/Seoul), helper 분리
- POLICY_TBD: 제품 copy / 자정 경계 세부

## Privacy
- exact GPS public: **absent**
- privacy transform: HMAC epoch + jitter + grid
- stable epoch: same session → deterministic display point
- permanent fingerprint prevention: new presence session rotates epoch
- privacy secret: Railway `PRESENCE_PRIVACY_SECRET` set (값 미출력 / git 미커밋)
- public distance: rounded `approxDistanceMeters`

## Nearby Search
- bounding box: yes (lat/lng range)
- Haversine: yes
- PostGIS: **not introduced**
- limit: `PRESENCE_NEARBY_LIMIT` (default 40)
- self exclusion: PASS
- expired exclusion: PASS (store unit + query-time)
- hidden exclusion: PASS (smoke logout)

## Mobile
- Presence Privacy Confirm: existing UX reused
- Duration: existing UX reused
- Active / OFF: existing UX + server sync
- Logout hide: AuthService → `hideOnLogout`
- API 실패 시 fake local ON 제거

## Explore
- Venue source: MockVenueSearchAdapter
- Join source: PostgreSQL (Phase F)
- User source: PostgreSQL UserPresence + public profile
- 사람 filter: nearby presence users
- marker / user sheet / re-search: Gate A contract 유지 (회귀 없음 목표)

## Android E2E
- A enable: **PASS** (실기기 UI)
- DB AVAILABLE: **PASS**
- A logout hidden: **PASS** (실기기 logout)
- B discovers A: **PASS** (사람 filter · 김진우 marker)
- B opens A profile: **PASS** (User Sheet)
- privacy copy: **PASS**
- expired hidden: unit store **PASS**
- detail: `docs/phase-g-android-final-report.md`

## Security
- exact location logs: not added
- private DTO: exact coords absent
- secrets: Railway env only
- auth: currentUser only

## Tests
- prisma validate/generate: PASS
- API typecheck/build: PASS
- mobile typecheck: PASS
- presence privacy/geo/store tests: PASS (10)
- domain/validation: PASS
- Phase F regression smoke: **SMOKE_PASS**
- Phase G presence smoke: **SMOKE_PASS**

## Railway Deploy
- main push: yes (`c605c1f` + follow-ups)
- auto deploy: SUCCESS
- health: ok / connected
- database: connected

## Remaining
- Android 실기기 Manual E2E 확인 (아래 체크리스트)
- Actual Venue Provider
- Coin Hold / Settlement
- Real OAuth
- Identity Verification
- PostGIS optimization

## Android Manual Checklist (one-device)

1. Metro: `EXPO_PUBLIC_API_URL=https://api-production-2d67e.up.railway.app`
2. TEST A: DEV_A → 지금 조인 가능 ON → Active → OFF → logout hide
3. Cursor smoke already re-armed DEV_A AVAILABLE at Geoje QA coords (재실행 시 기본 CLEANUP 없음)
4. TEST B: DEV_B → Explore → [사람] → 김진우 marker → sheet (정확한 위치 비공개 copy)
5. 종료 후: `CLEANUP=1` 로 smoke 재실행 또는 A에서 Presence OFF

## Result
**MANUAL_PENDING** (server/Railway/smoke PASS; Android 실기기 수동 확인 대기)
