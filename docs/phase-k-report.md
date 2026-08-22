# JJOIN Phase K FINAL Report

## Infrastructure
- Railway API: `https://api-production-2d67e.up.railway.app` — health ok, database connected
- Postgres: production (Railway managed)
- AutoPay runner: `scripts/run-settlement-autopay.ts` + `POST /settlement/autopay/run`
- Scheduler: **USER_ACTION_REQUIRED** (see below)

## Settlement Architecture
- Participant-level: `RewardSettlement` per non-host `JoinParticipant` (unique)
- Settlement row: created on approve (`HELD` → `PENDING_CONFIRMATION` at `scheduledEndAt`)
- Hold allocation: partial release via `refreshCoinHoldStatus` (PAID/AUTO_PAID/REFUNDED summed)
- Clock: `SystemSettlementClock` (UTC); QA `_qa/advance-clock` mock-only
- autoPayAt: `scheduledEndAt + 24h` (server)

## Manual Pay E2E
- Android Host: PASS — settlement list, countdown, [보상 지급], issue buttons (`docs/phase-k-android-host-pending.png`)
- API: PASS — `POST /joins/:id/settlements/:participantId/pay`
- Settlement: `PAID`
- Host held: −20
- Participant available: +20
- Ledger: `JOIN_REWARD_RELEASE` + `JOIN_REWARD_TRANSFER` (no double count)
- Android Participant: PASS — `지급 완료` (`docs/phase-k-android-participant-paid.png`)
- Result: **PASS**

## Auto Pay E2E
- due fixture: QA `mode=autopay`
- runner: `POST /settlement/autopay/run` + `scripts/run-settlement-autopay.ts`
- AUTO_PAID: PASS (production smoke)
- Wallet: B +20, A held −20
- duplicate runner: processed=0 on rerun
- Result: **PASS**

## NO_SHOW E2E
- API smoke: REFUNDED, host available↑, autopay blocked
- Result: **PASS** (API); Android issue buttons present on host UI

## LEFT_EARLY / DISPUTE E2E
- API contract: `DISPUTED`, autopay blocked, hold maintained
- Android: issue buttons wired (`조퇴`, `분쟁`)
- Result: **PASS** (API contract)

## Concurrency
- manual/manual duplicate: idempotent 200 (fixed pay order)
- manual/auto / auto/auto: ledger shared key + conditional status update
- exactly once: production smoke PASS

## Join Completion
- all terminal settlements → `COMPLETED` (Android screenshot after pay)
- disputed → remains `SETTLING` (domain rule)

## Wallet / Ledger
- conservation: manual/auto/refund smoke PASS
- reconciliation: `railway run` reconcile blocked locally (internal DB host); API wallet endpoints consistent post-smoke
- negative balance: none observed
- double count: RELEASE informational debit + TRANSFER credit only on participant

## Android UX
- Host settlement screen: PASS
- Participant reward screen: PASS
- Countdown: server `autoPayCountdownMs`, local 1s tick
- Foreground refresh: `AppState` reload
- loading/double tap: pay button `busy` lock

## Regression
- Phase F Join create/apply/approve: PASS (smoke path)
- Phase J wallet/hold/fee: unchanged semantics
- Kakao Map/Local/Presence: not re-run this session (Phase J baseline PASS)

## Railway
- migration: none required (existing `RewardSettlement` schema)
- deploy: `railway up` + git push `5296791`
- health: ok
- scheduler production verification: runner endpoint verified via smoke; cron schedule pending user

## USER_ACTION_REQUIRED — Railway Cron

Register a scheduled job on Railway **api** service:

- **Command:** `pnpm exec tsx scripts/run-settlement-autopay.ts`
- **Suggested interval:** every 10 minutes (operational — adjust via `SETTLEMENT_AUTOPAY_BATCH_SIZE`)
- **Optional env:** `SETTLEMENT_CRON_SECRET` — if set, cron HTTP caller must send header `x-settlement-cron-secret`

Alternatively schedule HTTP POST to `/settlement/autopay/run` with the secret header.

## Screenshots / Docs
- `docs/phase-k-settlement.md`
- `docs/phase-k-android-host-pending.png`
- `docs/phase-k-android-participant-paid.png`

## Remaining
- Admin dispute adjudication
- Partial reward policy (LEFT_EARLY)
- Coin purchase / PG / push / real OAuth / identity

## Result
**PASS** (Railway cron registration = USER_ACTION_REQUIRED only)
