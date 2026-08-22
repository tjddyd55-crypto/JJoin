/**
 * Settlement auto-pay batch runner for Railway cron / manual ops.
 * Usage: pnpm exec tsx scripts/run-settlement-autopay.ts
 */
import { PrismaClient } from '@prisma/client';
import { CoinLedgerService } from '../apps/api/src/modules/wallet/coin-ledger.service.ts';
import { SettlementService } from '../apps/api/src/modules/settlement/settlement.service.ts';
import type { PrismaService } from '../apps/api/src/prisma/prisma.service.ts';

async function main() {
  const prisma = new PrismaClient();
  const ledger = new CoinLedgerService(prisma as PrismaService);
  const settlement = new SettlementService(prisma as PrismaService, ledger);
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
