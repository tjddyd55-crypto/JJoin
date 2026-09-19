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

/** Reuse the same key while the user retries the same body after a failed send. */
export function resolveDirectMessageIdempotencyKey(input: {
  body: string;
  previousBody: string | null;
  previousKey: string | null;
  mint: () => string;
}): { key: string; body: string } {
  if (input.previousKey && input.previousBody === input.body) {
    return { key: input.previousKey, body: input.body };
  }
  return { key: input.mint(), body: input.body };
}
