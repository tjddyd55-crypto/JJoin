/**
 * Phase J wallet ↔ ledger reconciliation.
 * Usage: pnpm exec tsx scripts/phase-j-wallet-reconcile.ts
 */
import { PrismaClient } from '@prisma/client';
import { MockAuthPersona } from '../packages/types/src/index.ts';
import { CoinLedgerService } from '../apps/api/src/modules/wallet/coin-ledger.service.ts';
import type { PrismaService } from '../apps/api/src/prisma/prisma.service.ts';

const SUBJECT: Record<string, string> = {
  DEV_A: 'dev-persona-a',
  DEV_B: 'dev-persona-b',
};

async function main() {
  const prisma = new PrismaClient();
  const ledger = new CoinLedgerService(prisma as PrismaService);
  try {
    for (const persona of [MockAuthPersona.DEV_A, MockAuthPersona.DEV_B]) {
      const account = await prisma.socialAccount.findUnique({
        where: {
          provider_providerSubject: {
            provider: 'KAKAO',
            providerSubject: SUBJECT[persona],
          },
        },
      });
      if (!account) {
        console.log(persona, 'SKIP no user');
        continue;
      }
      const wallet = await prisma.wallet.findFirst({ where: { userId: account.userId } });
      if (!wallet) {
        console.log(persona, 'SKIP no wallet');
        continue;
      }
      const result = await ledger.reconcileWallet(wallet.id);
      console.log(persona, result.ok ? 'PASS' : 'FAIL', {
        availableProjected: result.availableProjected,
        availableLedger: result.availableLedger,
        heldProjected: result.heldProjected,
        heldLedger: result.heldLedger,
      });
      if (!result.ok) process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
