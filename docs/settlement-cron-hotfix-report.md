# JJOIN Settlement Cron Production Hotfix Report

Date: 2026-08-23

## Root Cause

- **countOpenDisputesForJoin owner:** `DisputeService.countOpenDisputesForJoin`
- **undefined object:** `this.disputes` on `SettlementService`
- **why API worked:** Nest `SettlementModule` injects `DisputeService` + `NotificationEventService`
- **why cron failed:** `scripts/run-settlement-autopay.ts` still did `new SettlementService(prisma, ledger)` (2 args)
- **introducing commits:**
  - Phase L `95af9d5` — added `DisputeService` (3rd ctor arg)
  - Phase R `e416815` — added `NotificationEventService` (4th ctor arg)
  - cron script never updated after Phase L (latent until auto-pay hit `tryCompleteJoin`)

## Fix

| File | Change |
|------|--------|
| `settlement-standalone.factory.ts` | Shared composition: prisma + ledger + disputes + notifications |
| `scripts/run-settlement-autopay.ts` | Use factory |
| `settlement.service.ts` | Fail-closed ctor guard if disputes/notifications missing |
| `settlement-cron-composition.node-test.ts` | Regression: broken wiring throws; factory wires deps |

- dispute safety: countOpenDisputesForJoin retained; no bypass
- notification isolation: cron delivery `kick()` is no-op; enqueueSafe remains non-throwing

## Tests

| Case | Result |
|------|--------|
| cron composition | PASS |
| missing disputes → ctor throw | PASS |
| factory has countOpenDisputesForJoin | PASS |
| factory has enqueueSafe | PASS |

Domain exactly-once / open-dispute pay stop covered by existing Phase K/L smoke (unchanged).

## Production

(pending deploy + scheduled run)

## Accounting Integrity

(pending post-deploy check — summary counts only)

## Result

PENDING_DEPLOY
