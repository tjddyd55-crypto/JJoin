# Phase K — Participant Settlement & Reward Release

## Overview

Join 경기 종료(`scheduledEndAt`) 이후 **참가자(Participant) 단위**로 보상 정산이 진행됩니다.

- Host 수동 지급 → `PAID`
- Host 미조치 + 24h → AutoPay runner → `AUTO_PAID`
- NO_SHOW → refund + `REFUNDED`
- LEFT_EARLY / DISPUTE → auto payout 중지, Hold 유지

Host participant는 정산 대상에서 제외됩니다 (Phase J 원칙 유지).

## Lifecycle

| 시점 | Join | RewardSettlement |
|------|------|------------------|
| Participant approve | — | row 생성 (`HELD`, amount snapshot) |
| `now >= scheduledEndAt` | `SETTLING` (lazy) | `HELD` → `PENDING_CONFIRMATION` |
| Host pay | — | `PAID` |
| `now >= autoPayAt` | — | `AUTO_PAID` (runner) |
| All non-host terminal & no DISPUTED | `COMPLETED` | — |

`autoPayAt = scheduledEndAt + 24h` (server 계산, client 임의 전송 금지).

## Accounting

### JOIN_REWARD_RELEASE (DEBIT on host wallet ledger)

Host `heldBalance` 감소. `availableBalance` 불변.

### JOIN_REWARD_TRANSFER (CREDIT on participant wallet ledger)

Participant `availableBalance` 증가. **경제적 이전의 SSOT.**

### JOIN_REWARD_REFUND (NO_SHOW)

Host `held`↓ + `available`↑. Participant 변화 없음.

**Double counting 방지:** RELEASE + TRANSFER는 한 transfer 트랜잭션 내 쌍으로 기록되며, manual/auto는 동일 idempotency key `settlement:{id}:reward-transfer`를 공유합니다.

## CoinHold status

`refreshCoinHoldStatus`가 settlement terminal 합산으로 갱신:

- `OPEN` → `PARTIALLY_RELEASED` → `RELEASED` / `REFUNDED`

## API

| Method | Path | Auth |
|--------|------|------|
| GET | `/joins/:joinId/settlements` | Host or participant |
| POST | `/joins/:joinId/settlements/:participantId/pay` | Host only |
| POST | `/joins/:joinId/settlements/pay-all` | Host only |
| POST | `/joins/:joinId/settlements/:participantId/issue` | Host only |
| POST | `/joins/:joinId/settlements/_qa/advance-clock` | Host, mock only |

Join detail (`GET /joins/:id`)에 `settlement` summary 포함 (host/participant viewer).

## Concurrency

- Ledger idempotency keys
- `rewardSettlement.updateMany` where `PENDING_CONFIRMATION` for pay claim
- Manual/manual, manual/auto, auto/auto → exactly-once economic effect

## AutoPay runner

```bash
pnpm exec tsx scripts/run-settlement-autopay.ts
```

Operational config:

- `SETTLEMENT_AUTOPAY_BATCH_SIZE` (default 20)
- Railway cron schedule (see Phase K report)

## QA clock

`SOCIAL_AUTH_MODE=mock` 환경에서만 `_qa/advance-clock` 허용.

Modes:

- `open` — `scheduledEndAt` 과거, `PENDING_CONFIRMATION`
- `autopay` — `autoPayAt`도 과거

Production real user time-travel API 금지.

## Smoke

```bash
$env:API_BASE='https://api-production-2d67e.up.railway.app'
pnpm exec tsx scripts/phase-k-settlement-smoke.ts
```

## Mobile UX

- Host: 참가자별 reward, 상태, countdown, [보상 지급], [불참/조퇴/분쟁]
- Participant: 보상 amount, 상태, countdown
- Countdown: server `autoPayCountdownMs` 기준, 1초 local tick, foreground refresh
