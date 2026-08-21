import type { PrismaClient } from '@prisma/client';
import { SCREEN_GOLF_CODE } from '@jjoin/types';

/**
 * Idempotent foundation rows required for Join FK.
 * Not a user/test-data seed — Sport + CoinAsset only.
 */
export async function ensureFoundation(prisma: PrismaClient) {
  const sport = await prisma.sport.upsert({
    where: { code: SCREEN_GOLF_CODE },
    create: {
      code: SCREEN_GOLF_CODE,
      nameKey: 'sport.screen_golf',
      sortOrder: 1,
      rule: {
        create: {
          durationStrategy: 'PER_PLAYER_MINUTES',
          durationParamJson: { minutesPerPlayer: 60 },
          defaultJoinMethod: 'APPROVAL',
        },
      },
    },
    update: {},
    include: { rule: true },
  });

  if (!sport.rule) {
    await prisma.sportRule.create({
      data: {
        sportId: sport.id,
        durationStrategy: 'PER_PLAYER_MINUTES',
        durationParamJson: { minutesPerPlayer: 60 },
        defaultJoinMethod: 'APPROVAL',
      },
    });
  }

  const coinAsset = await prisma.coinAsset.upsert({
    where: { code: 'JJOIN' },
    create: {
      code: 'JJOIN',
      nameKey: 'coin.jjoin',
    },
    update: {},
  });

  return { sport, coinAsset };
}
