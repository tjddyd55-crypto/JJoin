# JJOIN Phase J Android Final Report

## Device
- adb: `C:\Users\tjddy\AppData\Local\Android\Sdk\platform-tools\adb.exe`
- device: `R3KL202KGHF` (SM_S931N)
- package: `com.jjoin.app`
- Dev Client: Metro `127.0.0.1:8081` via `adb reverse` + `exp+jjoin://` deep link

## Remote
- API: `https://api-production-2d67e.up.railway.app`
- health: `status=ok`, `database=connected`, `env=production`
- mobile `.env`: `EXPO_PUBLIC_API_URL` = Railway (Kakao Map env unchanged)

## DEV_A Wallet
- login: PASS (김진우)
- funding: PASS — double mock sign-in `available` 동일 (`198`→`198`), 무한 증가 없음
- available before: **198** (Android MY Wallet UI)
- held before: **60**

## Create Preview
- room fee: **2 Coin** (서버)
- reward/person: **20 Coin** TEST ONLY
- reward slots: **3명** (4−1 Host)
- reward hold: **60 Coin**
- total required: **62 Coin**
- server-calculated: PASS — UI 라벨 `코인 요약 (서버 계산)` + preview API 값
- venue: JJOIN-owned `SG골프 거제점` (Kakao Live 미사용)

QA: `docs/phase-j-android-create-preview.png`

## Create Result
- Join: `2c72771f-727a-4619-91ae-e9afefd168e5` OPEN
- Host participant: PASS (`HOST` / `APPROVED` / 김진우)
- ROOM_CREATION_FEE: **1** (`amount=2`, ref=joinId)
- JOIN_REWARD_HOLD: **1** (`amount=60`, ref=joinId)
- CoinHold: OPEN (ledger + hold amount 60)

QA: `docs/phase-j-android-create-done.png`

## Wallet After
- available: **136** (=198−62) — API 직후 확인
- held: **120** (=60+60)
- negative: 없음
- sync: PASS (Create 완료 카피 + Wallet history에 fee/hold 분리 표시)

QA before: `docs/phase-j-android-wallet-before.png`

## Ledger
- ADMIN_ADJUSTMENT: PASS (UI `테스트 코인 조정`)
- ROOM_CREATION_FEE: PASS (UI `방 생성 수수료` / `-2`)
- JOIN_REWARD_HOLD: PASS (UI `참가 보상 보류` / `-60`)
- immutable: PASS (`wallet/_meta` update/delete=false; mutation route 없음)

## DEV_B
- approved: PASS (Apply → Approve, confirmed=2)
- reward transferred: **NO** (`JOIN_REWARD_TRANSFER` count=0)
- wallet increased from reward: **NO** (available/held `200`/`0` 유지)

## Error UX
- insufficient balance: UI contract PASS (`보유 코인이 부족합니다.` + `canCreate` gate); 잔액 부족 fixture는 서버 smoke로 기검증, 실기기 drain은 생략
- double submit: code PASS (`submitting` lock + `idempotencyKey` per submit); 좌표 연타 억지 테스트 없음

## Regression
- Kakao Map: PASS (Explore 지도 + venue markers)
- Phase F Join: PASS (Create / Apply / Approve)
- Phase G Presence: UI `지금 조인 가능 OFF` 유지 (Explore)
- Phase H Venue: PASS (`스크린골프장 20곳`, Kakao Local 카드)

QA: `docs/phase-j-android-explore.png`

## Cleanup
- E2E Join 삭제 안 함
- Wallet balance DB raw UPDATE 안 함

## Result
**PASS**

Phase J 완전 종료. Settlement는 시작하지 않음.
