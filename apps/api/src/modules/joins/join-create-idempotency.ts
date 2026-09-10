import type { PrismaService } from '../../prisma/prisma.service';

export const JOIN_CLIENT_IDEMPOTENCY_OPTION_KEY = 'client_idempotency_key';

/**
 * Resolve a prior create by coin ledger key (fee/HOLD) or join option.
 * Reward 0 + fee 0 writes no ledger row — option lookup is required.
 */
export async function findJoinIdByClientIdempotencyKey(
  prisma: PrismaService,
  params: {
    hostUserId: string;
    clientKey: string;
    coinIdempotencyKeys: string[];
  },
): Promise<string | null> {
  for (const idempotencyKey of params.coinIdempotencyKeys) {
    const tx = await prisma.coinTransaction.findUnique({
      where: { idempotencyKey },
      select: { refType: true, refId: true },
    });
    if (tx?.refType === 'JOIN' && tx.refId) return tx.refId;
  }

  const option = await prisma.joinOption.findFirst({
    where: {
      optionKey: JOIN_CLIENT_IDEMPOTENCY_OPTION_KEY,
      optionValueJson: { equals: { key: params.clientKey } },
      join: { hostUserId: params.hostUserId },
    },
    select: { joinId: true },
  });
  return option?.joinId ?? null;
}
