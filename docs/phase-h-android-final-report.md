# JJOIN Phase H Final Report

## Railway
- deploy: SUCCESS (kakao vars + unscoped keyword fix)
- health: `status=ok` `database=connected` `env=production`
- venue provider: `VENUE_PROVIDER_MODE=kakao` → runtime source `KAKAO_LOCAL`

## Kakao Production
- connection: PASS
- query: `스크린골프` (Geoje viewport rect)
- result count: 26 (≤45)
- paging: capped at JJOIN max pages (≤45 documents)
- sample venues:
  - 골프존파크 상동스윙골프점
  - 골프존파크 사곡팰릭스골프점
  - 골프존파크 고현리더스골프점
- `골프존`: PASS (e.g. 골프존카운티 오라 / 을지로 등)
- `SG골프`: PASS (e.g. SG골프)
- `서울 스크린골프` / 서울 지역: PASS (e.g. 골프존파크 을지로3가역24시점, lat≈37.54)

## Persistence
- Venue row before/after: Railway TCP proxy unavailable from local; Explore path has **no** `prisma.venue` write
- Kakao `venueId`s are non-UUID Kakao place ids; `canCreateJoin=false`
- Kakao rows persisted: **ZERO** (SEARCH ≠ PERSIST)

## Android
- device: `R3KL202KGHF` / `com.jjoin.app` Dev Client
- initial screen golf: PASS (`스크린골프장 20곳`, 골프존파크 상동스윙골프점)
- 골프장 filter: PASS (venues only)
- 사람 filter: PASS (`스크린골프장 0곳`, no Kakao markers)
- 전체 filter: PASS (venues restored)
- re-search: PASS (CTA after pan → tap → refresh)
- 골프존: PASS
- SG골프: PASS
- 서울: PASS (을지로)
- marker: PASS
- sheet: PASS
  - name / category / roadAddress / address / phone
  - `카카오맵에서 보기`
  - Create Join disabled copy

## Security
- REST key git: absent (example key name only; tests use `test-key-not-real`)
- REST key mobile: absent (`EXPO_PUBLIC_API_URL` Railway only; no Kakao key)
- REST key logs: not printed
- server-only: PASS

## Regression
- Gate A: PASS (map / filters / sheet / re-search / nav)
- Phase F smoke: **SMOKE_PASS**
- Phase G smoke: **SMOKE_PASS**

## Result
**PASS**
