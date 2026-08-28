# JJOIN PREMIUM UX DEVICE CLOSURE REPORT

**Date:** 2026-08-25  
**Device:** `R3KL202KGHF` (SM-S931N)  
**Package:** `com.jjoin.app`  
**Worktree:** `C:\workspace\jjoin-main`  
**Captures:** `C:\Users\tjddy\jjoin-device-captures\phase-e-closure\`

## Dev Client

- **root cause (observed):**
  1. Cold start / `force-stop` 후 앱이 Product bundle이 아니라 **Expo Dev Client launcher**(`DEVELOPMENT SERVERS`)에 머무름. `http://127.0.0.1:8081` 선택 후에야 Product UI 진입.
  2. 세션 시작 시점에 **adb reverse 미적용**이면 Metro/`127.0.0.1:8081` 연결이 실패하기 쉬움 → launcher에 고착.
  3. Product UI 위에 떠 있는 **Tools** 버튼을 누르면 Expo Tools 오버레이로 보임 (본문 미렌더로 오인 가능).
  4. (부가) 로컬 `:3000`에 **matchon Next**와 JJOIN API가 동시에 LISTEN → mock-sign-in 간헐 **500**. matchon 프로세스 종료 후 로그인 안정화.
- **Metro:** `jjoin-main` `expo start --dev-client --port 8081` running
- **adb reverse:** `tcp:8081`, `tcp:3000` 재적용
- **product bundle:** launcher에서 `127.0.0.1:8081` 연결 후 Home/MY/Create/Membership 렌더 확인

## MY

- **FREE:** `일반` badge + `일반 회원` (`18-my-expired-free.png`) — period expire 후 soft re-login
- **PREMIUM:** `프리미엄` badge + `프리미엄 회원` + `YYYY.MM.DD까지` (`03-my-free.png`, `21-my-after-admin-grant.png`, `33-390-my.png`)

## Membership

- **FREE:** 일반 회원 + Premium 혜택 소개 + purchase CTA 없음 (`19-membership-free.png`)
- **PREMIUM:** 현재 플랜 Premium + 기간 + 조인 생성 이용료 면제 (`04-membership-premium.png`, `31-360-membership.png`)
- **cancel scheduled:** Premium 유지 + `2026.09.24까지` + `이용기간 종료 후 일반 회원으로 전환됩니다.` (`03-my-free.png`, `04-membership-premium.png`) — raw `CANCELLED` 미노출

## Join Create

- **FREE fee:** `2 Coin` + reward `20×3=60` + total `62` (`20-create-free-fee.png`)
- **PREMIUM fee:** `0 Coin` + badge `Premium 혜택` + reward hold 유지 (`11-premium-summary.png`, `35-390-create.png`)
- **reward:** Premium에서도 참가 보상 라인 유지 (사라지지 않음)
- **Quick Add:** `0 → +100 → 100 → +10 → 110` PASS; 부족 시 CTA `Coin이 부족합니다` (Premium 우회 없음) (`09-quickadd-110.png`)

## Cache

- **Admin FREE→PREMIUM refresh:** Admin activate API → 앱 logout/login(재설치 없음) → MY `프리미엄 회원` 즉시 반영 (`21-my-after-admin-grant.png`)
- Wallet available `200` / held `120` 유지 (activate mint 없음)

## Responsive

- **390:** `wm density 443` — MY / Membership / Create clipping 없음 (`33`–`35-390-*.png`)
- **360:** physical density `480` — MY / Membership / Create clipping 없음 (`30`–`32-360-*.png`)
- density **reset → 480** 확인

## Device

- **R3KL202KGHF:** Product UI Device QA PASS

## Accounting Regression

- **result:** 이전 Phase E API accounting PASS 유지. Device에서 FREE fee=2 / PREMIUM fee=0 / reward hold 표시 일치. Admin activate 후 available 불변.

## Figma

- **sync deferred:** READY gate에서 비필수 (지시 17)
- **visual mismatch:** 큰 이탈 없음. 소노트 — stack title이 `membership`/`account` 영문 lowercase (Club Minimal 본문 copy와 별개 chrome)

## Notes

- `DEV_B` mock-sign-in은 DB unique constraint로 500 → FREE 시각 QA는 `DEV_A` expire lifecycle로 수행
- 기능/SSOT 코드 rewrite 없음 (runtime QA only)

## Result

**PREMIUM_UX_READY**

## STOP

Internal Beta Distribution 자동 시작 안 함. 다음 지시 대기.
