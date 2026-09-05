/**
 * Phase J DEV coin seed / funding against PostgreSQL.
 * Usage (Railway or local DATABASE_URL):
 *   pnpm exec tsx scripts/phase-j-coin-seed.ts
 *
 * TEST ONLY / POLICY_TBD — not a production grant path.
 * Never prints secrets.
 */
import { PrismaClient } from '@prisma/client';
import { MockAuthPersona } from '../packages/types/src/index.ts';
import { ensureFoundation } from '../apps/api/src/foundation/ensure-foundation.ts';
import { CoinLedgerService } from '../apps/api/src/modules/wallet/coin-ledger.service.ts';
import { isDevCoinFundingAllowed } from '../apps/api/src/coin/dev-coin-policy.ts';
import type { PrismaService } from '../apps/api/src/prisma/prisma.service.ts';

const PERSONA_SUBJECT: Record<MockAuthPersona, string> = {
  [MockAuthPersona.DEV_A]: 'dev-persona-a',
  [MockAuthPersona.DEV_B]: 'dev-persona-b',
  [MockAuthPersona.DEV_C]: 'dev-persona-c',
  [MockAuthPersona.DEV_ADMIN]: 'dev-persona-admin',
};

async function main() {
  if (!isDevCoinFundingAllowed()) {
    throw new Error('dev_coin_funding_forbidden — set SOCIAL_AUTH_MODE=mock and COIN_POLICY_MODE=dev');
  }
  const prisma = new PrismaClient();
  try {
    await ensureFoundation(prisma);
    const ledger = new CoinLedgerService(prisma as PrismaService);

    for (const persona of [MockAuthPersona.DEV_A, MockAuthPersona.DEV_B]) {
      const account = await prisma.socialAccount.findUnique({
        where: {
          provider_providerSubject: {
            provider: 'KAKAO',
            providerSubject: PERSONA_SUBJECT[persona],
          },
        },
      });
      if (!account) {
        console.log(persona, 'missing — sign in once via mock auth first');
        continue;
      }
      await ledger.ensureDevFundingTarget(account.userId, persona);
      const wallet = await ledger.getOrCreateWallet(account.userId);
      console.log(persona, 'available=', String(wallet.availableBalance), 'held=', String(wallet.heldBalance));
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
