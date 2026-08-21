# JJOIN Phase G Android Final Report

## Device
- adb: `C:\Users\tjddy\AppData\Local\Android\Sdk\platform-tools\adb.exe`
- device: `R3KL202KGHF` (SM_S931N)
- package: `com.jjoin.app`
- Dev Client: Metro `127.0.0.1:8081` via `adb reverse` (deep link)

## Remote
- Railway API: https://api-production-2d67e.up.railway.app
- health: `status=ok`
- database: `connected` (`env=production`)
- mobile `.env`: `EXPO_PUBLIC_API_URL` = Railway HTTPS (NAVER Map Client ID unchanged)

## DEV_A Presence
- login: PASS (김진우)
- ON: PASS (privacy → duration 1시간 → UI `ON`)
- DB AVAILABLE: PASS (`GET /me/presence`)
- availableUntil: PASS (present)
- Active UI: PASS (`지금 조인 가능` / `ON`)
- OFF: PASS (UI `OFF` + DB HIDDEN + nearby absent)
- DB hidden: PASS
- logout hide: PASS (Android 로그아웃 → DB HIDDEN + nearby absent)

## DEV_B Nearby
- login: PASS (박민수)
- 사람 filter: PASS (`지금 조인 가능 1명`)
- DEV_A marker: PASS (`김진우 ✓`)
- source: live PostgreSQL UserPresence + privacy display (smoke/API confirmed; mock users 아님)
- User Sheet: PASS (`김진우 ✓`, `THIRTIES · INTERMEDIATE`, `약 0.0km · 거제`, `지금 조인 가능`)
- privacy copy: PASS (`정확한 위치는 공개되지 않습니다.`)

## Privacy
- raw GPS public: absent (API deny-list scan leaks=0)
- approximate point: PASS (`displayLat` / `displayLng`)
- epoch stability: PASS (unit + prior Phase G tests)
- permanent fingerprint prevention: PASS (epoch rotation tests)

## Map Regression
- NAVER Map: PASS (Explore load)
- Venue Marker: PASS (DEV_A Explore에서 SG골프 거제점 등 확인)
- User Marker: PASS (김진우)
- Current Location control: present (`◎`)
- Re-search / filters: PASS (사람 / 전체 UI 동작)
- Bottom Sheets: PASS (privacy / duration / user sheet)

## Cleanup
- DEV_A Presence: HIDDEN
- DEV_B Presence: HIDDEN
- Join data: not deleted

## Result
**PASS**
