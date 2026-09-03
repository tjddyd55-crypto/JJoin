/**
 * DEV-only: mark HOST participants COMPLETED on already COMPLETED joins.
 * Played-together is computed from COMPLETED pairs — no separate aggregate table.
 * Idempotent. Production: NO.
 *
 *   $env:DATABASE_URL=...
 *   pnpm exec tsx scripts/backfill-played-together-host-completed.ts
 */
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const completedJoins = await prisma.join.count({ where: { status: 'COMPLETED' } });
    const result = await prisma.joinParticipant.updateMany({
      where: {
        role: 'HOST',
        participationStatus: { in: ['APPROVED', 'CONFIRMED'] },
        join: { status: 'COMPLETED' },
      },
      data: { participationStatus: 'COMPLETED' },
    });
    console.log(
      JSON.stringify({
        joinsScanned: completedJoins,
        hostRowsUpdated: result.count,
        note: 'played-together remains a computed query; no pair rows inserted',
      }),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
