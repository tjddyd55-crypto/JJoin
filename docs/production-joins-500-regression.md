# Production `/joins` 500 Regression

**Date:** 2026-08-22  
**Status:** FIXED

## Symptom

After Phase N enabled `SOCIAL_AUTH_MODE=hybrid` on Railway production:

- `POST /joins` → HTTP 500
- Phase F / J / K / L smokes failed at join create
- Phase G presence smoke still passed (no join create)

## Root cause

Railway API log:

```
ERROR [ExceptionsHandler] coin_policy_disabled
  at resolveRoomCreationFee (dev-coin-policy.js)
  at JoinsService.create
```

`resolveCoinPolicyMode()` only enabled TEST coin policy when:

- `COIN_POLICY_MODE=dev`, or
- `SOCIAL_AUTH_MODE=mock`

Phase N switched production to **`SOCIAL_AUTH_MODE=hybrid`** (real Kakao + DEV personas).
Hybrid was not treated as a regression social mode, so coin policy stayed **`disabled`**.
`resolveRoomCreationFee()` threw an unhandled `Error`, surfaced as HTTP 500.

This was **not** identity gate, Prisma schema, or join payload regression.

## Fix

1. **`apps/api/src/coin/dev-coin-policy.ts`**
   - Treat `SOCIAL_AUTH_MODE=hybrid` like `mock` for TEST coin policy + DEV persona funding.
   - Throw typed `CoinPolicyDisabledError` instead of generic `Error`.

2. **`apps/api/src/modules/joins/joins.service.ts`**
   - Map `CoinPolicyDisabledError` → `503 COIN_POLICY_UNAVAILABLE` (never 500).

3. **`apps/api/src/settlement/settlement-clock.ts`**
   - Allow settlement QA advance-clock under `hybrid` (same regression as coin policy).

4. **`scripts/dev-coin-policy.node-test.ts`**
   - Guards hybrid vs real social mode behavior.

5. **`scripts/phase-m-auth-smoke.ts`**
   - Accept `403 mock_identity_not_allowed` for exchange-only users on hybrid production.

## Accounting impact

None — no ledger/wallet rows were created by failed requests (transaction never started).

## Auth impact

None — Kakao actual login / exchange unchanged.
Real unverified Kakao users still hit `IDENTITY_REQUIRED` before coin policy.

## Expected error contract (post-fix)

| Case | HTTP |
|------|------|
| DEV_A create (hybrid) | 2xx |
| Unverified real user create | 403 `IDENTITY_REQUIRED` |
| Insufficient balance | 400 `INSUFFICIENT_BALANCE` |
| Coin policy truly disabled (`SOCIAL_AUTH_MODE=real`) | 503 `COIN_POLICY_UNAVAILABLE` |

## Verification

After deploy, re-run against production API:

- `phase-f-smoke.ts`
- `phase-j-coin-smoke.ts`
- `phase-k-settlement-smoke.ts`
- `phase-l-dispute-smoke.ts`
- `phase-n-kakao-e2e-server.ts`
