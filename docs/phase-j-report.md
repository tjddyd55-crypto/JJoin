# JJOIN Phase J Report

## Start Gate
- Phase I.2: PASS (`2de8f1f` refine kakao venue marker visuals) — closed before Phase J
- working tree: clean at start; Phase I.2 not mixed into Phase J commits

## Architecture
- CoinAsset: `JJOIN` singleton via `ensureFoundation` upsert
- Wallet: `unique(userId, coinAssetId)` — `availableBalance` / `heldBalance` projection
- Ledger: `CoinTransaction` append-only SSOT (`idempotencyKey` unique)
- Hold: `CoinHold` OPEN per Join (unique index on `join_id`)
- Accounting SSOT: Ledger; wallet balances updated only with ledger writes

## Policy
- Room Creation Fee: TEST ONLY `2` (`COIN_POLICY_MODE=dev` / mock auth) — **POLICY_TBD** production
- Reward min/max: **POLICY_TBD**
- KRW value: **POLICY_TBD** (no ₩ display)
- DEV policy: default reward/participant `20`, funding target available `200`
- Production policy: **POLICY_TBD** — fee/reward not hardcoded as product truth

## Wallet
- DEV_A: funded to target via mock sign-in ADMIN_ADJUSTMENT (ledger)
- DEV_B: same funding; no reward transfer after Apply
- available / held: after create smoke `138` / `60` (from `200` / `0` with fee `2` + hold `60`)
- uniqueness: `(userId, coinAssetId)` enforced

## Join Create
- Room fee: separate `ROOM_CREATION_FEE` DEBIT
- Reward hold: separate `JOIN_REWARD_HOLD` DEBIT + `CoinHold`
- atomic: single Prisma `$transaction` (Join → fee → hold)
- rollback: `INSUFFICIENT_BALANCE` before durable side effects
- idempotency: `join:{key}:room-fee` / `join:{key}:reward-hold`

## Ledger
- ROOM_CREATION_FEE: PASS (1 per Join)
- JOIN_REWARD_HOLD: PASS (1 per Join)
- ADMIN_ADJUSTMENT: PASS (DEV funding)
- immutable: no update/delete wallet mutation routes (`wallet/_meta`)
- reconciliation: script `scripts/phase-j-wallet-reconcile.ts` (run with DATABASE_URL)

## Concurrency
- negative prevention: wallet `SELECT … FOR UPDATE` in create tx
- duplicate: same idempotencyKey → same Join, no double debit
- concurrent spend: two oversized creates → 0 success / 2 fail (no negative balance)

## Mobile
- Wallet: `GET /me/wallet` live balances + recent txs
- Create summary: `POST /joins/coin-preview` server values
- insufficient balance: copy `보유 코인이 부족합니다.` (no purchase flow)
- Android E2E: **PASS** — see `docs/phase-j-android-final-report.md`

## Security
- currentUser: wallet APIs guarded; no body.userId
- dev funding: mock auth + DEV policy only; script + persona sign-in top-up
- secret exposure: smoke/scripts do not print tokens / DATABASE_URL

## Regression
- Phase F: PASS (Create/Apply/Approve smoke)
- Phase G: PASS (presence smoke)
- Phase H: PASS (Kakao Local venue smoke)
- Phase I: prior PASS retained (map/markers); not re-shot this session

## Railway
- migration: `0003_coin_hold_join_unique` via preDeploy `prisma migrate deploy`
- main push: PASS (`8d7803b`)
- deploy: ONLINE
- health: `ok` / `database: connected`
- DB: PostgreSQL connected

## Remaining
- Reward Release / Transfer / Refund
- Attendance Confirmation / No-show / Dispute
- 24h Auto Pay
- Coin Purchase / PG / Shop
- Actual OAuth / Identity Verification
- Android E2E PASS (실기기)

## Result

**PASS**
