import type { DirectMessageDto } from '@jjoin/types';

/** Merge by id so a stale poll cannot drop a just-sent row. */
export function mergeDirectMessages(
  existing: DirectMessageDto[],
  incoming: DirectMessageDto[],
): DirectMessageDto[] {
  const byId = new Map<string, DirectMessageDto>();
  for (const row of [...existing, ...incoming]) {
    byId.set(row.id, row);
  }
  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

/** Reuse the same key while the user retries the same payload after a failed send. */
export function resolveRetryIdempotencyKey(input: {
  fingerprint: string;
  previousFingerprint: string | null;
  previousKey: string | null;
  mint: () => string;
}): { key: string; fingerprint: string } {
  if (input.previousKey && input.previousFingerprint === input.fingerprint) {
    return { key: input.previousKey, fingerprint: input.fingerprint };
  }
  return { key: input.mint(), fingerprint: input.fingerprint };
}

export function resolveDirectMessageIdempotencyKey(input: {
  body: string;
  previousBody: string | null;
  previousKey: string | null;
  mint: () => string;
}): { key: string; body: string } {
  const resolved = resolveRetryIdempotencyKey({
    fingerprint: input.body,
    previousFingerprint: input.previousBody,
    previousKey: input.previousKey,
    mint: input.mint,
  });
  return { key: resolved.key, body: resolved.fingerprint };
}

export function giftAttemptFingerprint(input: {
  toUserId: string;
  amount: string;
  message: string;
}): string {
  return `${input.toUserId}|${input.amount}|${input.message}`;
}
