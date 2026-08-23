/**
 * Settlement auto-pay batch runner for Railway cron / manual ops.
 * Usage: pnpm exec tsx scripts/run-settlement-autopay.ts
 *
 * Must use createStandaloneSettlementService — Nest DI wires DisputeService +
 * NotificationEventService; positional `new SettlementService(prisma, ledger)` alone
 * leaves disputes undefined and crashes on countOpenDisputesForJoin.
 */
import { PrismaClient } from '@prisma/client';
import { createStandaloneSettlementService } from '../apps/api/src/modules/settlement/settlement-standalone.factory.ts';

async function main() {
  const prisma = new PrismaClient();
  const settlement = createStandaloneSettlementService(prisma);
  try {
    const batchSize = Number(process.env.SETTLEMENT_AUTOPAY_BATCH_SIZE ?? 20);
    const result = await settlement.runAutoPayBatch(batchSize);
    console.log('settlement_autopay', JSON.stringify(result));
    if (result.processed < 0) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
