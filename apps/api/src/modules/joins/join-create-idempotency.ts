import { Prisma } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';

export const JOIN_CLIENT_IDEMPOTENCY_OPTION_KEY = 'client_idempotency_key';

export type JoinCreateIdempotencyKind = 'standard' | 'store_matching';

export type JoinIdempotencyReader = {
  join: PrismaService['join'];
  coinTransaction: PrismaService['coinTransaction'];
  joinOption: PrismaService['joinOption'];
};

/** Ledger write keys. Client-keyed creates are host-scoped so hosts cannot collide. */
export function writeJoinCreateCoinIdempotencyKey(
  kind: JoinCreateIdempotencyKind,
  purpose: 'room-fee' | 'reward-hold',
  hostUserId: string,
  idemBase: string,
  clientKeyPresent: boolean,
): string {
  if (kind === 'store_matching') {
    if (clientKeyPresent) return `store-join:${hostUserId}:${idemBase}:reward-hold`;
    return `store-join:${idemBase}:reward-hold`;
  }
  if (clientKeyPresent) return `join:${hostUserId}:${idemBase}:${purpose}`;
  return `join:${idemBase}:${purpose}`;
}

/** Host-scoped keys first, then pre-migration global keys. */
export function lookupJoinCreateCoinIdempotencyKeys(
  kind: JoinCreateIdempotencyKind,
  hostUserId: string,
  clientKey: string,
): string[] {
  if (kind === 'store_matching') {
    return [
      `store-join:${hostUserId}:${clientKey}:reward-hold`,
      `store-join:${clientKey}:reward-hold`,
    ];
  }
  return [
    `join:${hostUserId}:${clientKey}:room-fee`,
    `join:${hostUserId}:${clientKey}:reward-hold`,
    `join:${clientKey}:room-fee`,
    `join:${clientKey}:reward-hold`,
  ];
}

export function isPrismaUniqueConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

/**
 * Lookup-first is not enough under concurrency. Callers must also write
 * Join.clientIdempotencyKey so PG unique (host, key) serializes the insert.
 */
export async function findJoinIdByClientIdempotencyKey(
  prisma: JoinIdempotencyReader,
  params: {
    hostUserId: string;
    clientKey: string;
    kind: JoinCreateIdempotencyKind;
  },
): Promise<string | null> {
  const byJoinUnique = await prisma.join.findUnique({
    where: {
      hostUserId_clientIdempotencyKey: {
        hostUserId: params.hostUserId,
        clientIdempotencyKey: params.clientKey,
      },
    },
    select: { id: true },
  });
  if (byJoinUnique) return byJoinUnique.id;

  const coinKeys = lookupJoinCreateCoinIdempotencyKeys(
    params.kind,
    params.hostUserId,
    params.clientKey,
  );
  for (const idempotencyKey of coinKeys) {
    const ledger = await prisma.coinTransaction.findUnique({
      where: { idempotencyKey },
      select: { refType: true, refId: true },
    });
    if (ledger?.refType !== 'JOIN' || !ledger.refId) continue;
    const owned = await prisma.join.findUnique({
      where: { id: ledger.refId },
      select: { id: true, hostUserId: true },
    });
    if (owned?.hostUserId === params.hostUserId) return owned.id;
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

export async function executeJoinCreateWithHostKeyClaim<T>(args: {
  clientKey: string | undefined;
  findExisting: () => Promise<T | null>;
  create: () => Promise<T>;
  isUniqueViolation: (error: unknown) => boolean;
  unresolvedConflict: () => never;
}): Promise<T> {
  if (args.clientKey) {
    const existing = await args.findExisting();
    if (existing) return existing;
  }
  try {
    return await args.create();
  } catch (error) {
    if (args.clientKey && args.isUniqueViolation(error)) {
      const reused = await args.findExisting();
      if (reused) return reused;
      args.unresolvedConflict();
    }
    throw error;
  }
}
