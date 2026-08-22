# Phase L — Dispute Resolution & Admin Adjudication

## Lifecycle

| Stage | Settlement | DisputeCase | Economic effect |
|-------|------------|-------------|-----------------|
| Host LEFT_EARLY / DISPUTED | DISPUTED | OPEN | Hold maintained |
| Participant statement | DISPUTED | UNDER_REVIEW | none |
| Admin PAY_PARTICIPANT | PAID | RESOLVED | Host held↓, Participant available↑ |
| Admin REFUND_HOST | REFUNDED | RESOLVED | Host held↓, Host available↑ |

NO_SHOW remains Phase K instant refund (no admin required).

## Model

`DisputeCase` — unique per `settlementId` and `joinParticipantId`.

## Admin auth

- `ADMIN_USER_IDS` env (comma-separated UUIDs), or
- Mock persona `DEV_ADMIN` (`dev-persona-admin`) when `SOCIAL_AUTH_MODE=mock`

## APIs

| Method | Path | Auth |
|--------|------|------|
| POST | `/me/disputes/:id/statement` | Participant |
| GET | `/me/disputes/:id` | Host or Participant |
| GET | `/admin/disputes` | Admin |
| GET | `/admin/disputes/:id` | Admin |
| POST | `/admin/disputes/:id/resolve` | Admin |

## Accounting reuse

Admin PAY/REFUND uses existing `applyRewardTransfer` / `applyRewardRefund` with Phase K idempotency keys — no duplicate ledger logic.

## AutoPay

`rewardStatus=DISPUTED` and open disputes skip AutoPay runner.

## Admin UI (local)

```bash
cd apps/admin
VITE_API_URL=https://api-production-2d67e.up.railway.app pnpm dev
```

Login: DEV_ADMIN mock sign-in.

## Smoke

```bash
pnpm exec tsx scripts/phase-l-dispute-smoke.ts
```
