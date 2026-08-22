# Phase J — Coin Accounting Foundation

## Goal

JJOIN Coin is not a single mutable balance field.

```
Wallet (projection)
+ Immutable CoinTransaction Ledger (SSOT)
+ CoinHold (reward reservation)
```

## Fee vs Reward (never merge)

| Event | Type | Effect |
|-------|------|--------|
| Room creation fee | `ROOM_CREATION_FEE` DEBIT | available ↓ (consumed by platform) |
| Participant reward reserve | `JOIN_REWARD_HOLD` DEBIT + Hold OPEN | available ↓, held ↑ |

Reward is **not** paid in this phase. No `JOIN_REWARD_TRANSFER` / release / refund.

## Accounting SSOT

- **Ledger (`CoinTransaction`)** = truth
- **Wallet `availableBalance` / `heldBalance`** = projection updated only with ledger writes
- Paths that UPDATE wallet without a ledger row are forbidden
- Ledger rows are append-only (no update/delete service APIs)

## Wallet model

- Unique `(userId, coinAssetId)` — default asset `JJOIN`
- `getOrCreateWallet` is idempotent
- `available < 0` is rejected (`INSUFFICIENT_BALANCE`)
- Held coins cannot be spent on another Join

Economic total for display: `available + held` (fee already removed from both).

## DEV / TEST policy (POLICY_TBD)

Production fee, reward min/max, KRW value, packages, refunds = **POLICY_TBD**.

DEV mode (`COIN_POLICY_MODE=dev` or `SOCIAL_AUTH_MODE=mock`):

| Knob | TEST ONLY value |
|------|-----------------|
| Room creation fee | `2` |
| Default reward / participant | `20` |
| Funding target available | `200` |

Documented as **TEST ONLY / POLICY_TBD**. Never hardcode into product copy as final policy.

Funding: internal script `scripts/phase-j-coin-seed.ts` + idempotent top-up on DEV persona mock sign-in. No production shop/PG UI.

## Join create (atomic)

Single DB transaction:

1. Auth host
2. Venue upsert (JJOIN-owned / MOCK fixtures for tests)
3. Policy resolve (server fee — ignore client fee)
4. Wallet lock (`SELECT … FOR UPDATE`)
5. Validate `available >= fee + hold`
6. Pre-generate `joinId`
7. `ROOM_CREATION_FEE` ledger
8. `CoinHold` + `JOIN_REWARD_HOLD` ledger
9. Join + Host participant

Any failure → full rollback (no orphan Join or orphan debit).

Reward slots: `plannedPlayerCount - 1` (host excluded).

## Idempotency

Client may send `idempotencyKey`. Ledger keys:

- `join:{key}:room-fee`
- `join:{key}:reward-hold`

Duplicate request returns the same Join — no double debit.

## Concurrency

Wallet row locked inside the create transaction. Concurrent creates that would go negative: at most one succeeds.

## APIs

- `GET /me/wallet` — available / held / total + recent txs
- `GET /me/wallet/summary` — same (compat)
- `GET /me/wallet/transactions?cursor&limit` — pagination
- `POST /joins/coin-preview` — server-calculated fee/hold/canCreate
- `POST /joins` — atomic create with optional `idempotencyKey`

## Settlement deferred

Not in Phase J:

- Reward transfer / release / refund
- Attendance / no-show / dispute
- 24h auto pay
- Coin purchase / PG / IAP

## Reconciliation

`scripts/phase-j-wallet-reconcile.ts` replays ledger for ADMIN_ADJUSTMENT / ROOM_CREATION_FEE / JOIN_REWARD_HOLD and compares to wallet projection.

## Security

- Wallet APIs use `currentUser` only
- DEV funding requires mock auth + DEV policy mode
- No KRW / ₩ display
