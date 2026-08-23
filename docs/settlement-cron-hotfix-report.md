# JJOIN Settlement Cron Production Hotfix Report

Date: 2026-08-23

## Root Cause

- **countOpenDisputesForJoin owner:** `DisputeService.countOpenDisputesForJoin`
- **undefined object:** `this.disputes` on `SettlementService`
- **why API worked:** Nest `SettlementModule` injects `DisputeService` + `NotificationEventService`
- **why cron failed:** `scripts/run-settlement-autopay.ts` still did `new SettlementService(prisma, ledger)` (2 args only)
- **introducing commits:**
  - Phase L `95af9d5` — added `DisputeService` (3rd ctor arg); cron never updated (latent)
  - Phase R `e416815` — added `NotificationEventService` (4th ctor arg)
  - Crash surfaces when auto-pay completes a settlement → `tryCompleteJoin` → `this.disputes.countOpenDisputesForJoin`

## Fix

| File | Change |
|------|--------|
| `settlement-standalone.factory.ts` | Shared composition: prisma + ledger + disputes + notifications |
| `scripts/run-settlement-autopay.ts` | Use factory |
| `settlement.service.ts` | Fail-closed ctor guard if disputes/notifications missing |
| `settlement-cron-composition.node-test.ts` | Regression: broken wiring throws; factory wires deps |

- dispute safety: `countOpenDisputesForJoin` retained; no bypass / no “treat as 0”
- notification isolation: cron delivery `kick()` no-op; `enqueueSafe` never rolls back settlement

## Tests

| Case | Result |
|------|--------|
| cron composition | PASS |
| missing disputes → ctor throw | PASS |
| factory has `countOpenDisputesForJoin` | PASS |
| factory has `enqueueSafe` | PASS |

## Production

| Item | Result |
|------|--------|
| deploy | SUCCESS (`2796d6a`, buildOnly then scheduled run) |
| cron execution | `2026-08-23T14:00:43Z` |
| exit | success — `settlement_autopay {"scanned":1,"processed":1,...}` |
| Last run | SUCCESS (no `countOpenDisputesForJoin` undefined) |
| next run | `*/10 * * * *` retained |

## Accounting Integrity

| Check | Result |
|-------|--------|
| duplicate release / transfer / refund | not observed in cron logs (exactly-once keys unchanged) |
| unexpected mutation | none reported |
| push failure isolation | PASS — enqueue warned (`notifications` table missing on prod DB) but autopay still `processed:1` |

> Follow-up (non-blocking for this hotfix): production DB missing Phase R `notifications` tables — apply Prisma migrate on API/Postgres when Phase R deploy continues. Settlement must not wait on that.

## Git

- commit: `2796d6a`
- push: `main` → origin
- clean: hotfix files committed; unrelated mobile/EAS dirty files left unstaged

## Result

**PASS**
