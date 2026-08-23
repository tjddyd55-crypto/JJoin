/**
 * Regression: settlement cron composition must wire DisputeService.
 * Run: pnpm exec tsx scripts/settlement-cron-composition.node-test.ts
 *
 * Does not write to any database — composition / constructor guards only.
 */
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { CoinLedgerService } from '../apps/api/src/modules/wallet/coin-ledger.service.ts';
import { SettlementService } from '../apps/api/src/modules/settlement/settlement.service.ts';
import { createStandaloneSettlementService } from '../apps/api/src/modules/settlement/settlement-standalone.factory.ts';
import type { PrismaService } from '../apps/api/src/prisma/prisma.service.ts';

type SettlementDeps = {
  disputes?: { countOpenDisputesForJoin?: unknown };
  notifications?: { enqueueSafe?: unknown };
};

const prisma = new PrismaClient() as unknown as PrismaService;
const ledger = new CoinLedgerService(prisma);

// A — legacy cron wiring (prisma + ledger only) must fail at construction, not mid-batch
assert.throws(
  () => new SettlementService(prisma, ledger, undefined as never, undefined as never),
  (e: unknown) =>
    e instanceof Error && e.message.includes('countOpenDisputesForJoin'),
);

// B — standalone factory wires dispute + notification deps
const settlement = createStandaloneSettlementService(prisma);
const deps = settlement as unknown as SettlementDeps;
assert.equal(typeof settlement.runAutoPayBatch, 'function');
assert.equal(typeof deps.disputes?.countOpenDisputesForJoin, 'function');
assert.equal(typeof deps.notifications?.enqueueSafe, 'function');

console.log('settlement-cron-composition.node-test PASS');
