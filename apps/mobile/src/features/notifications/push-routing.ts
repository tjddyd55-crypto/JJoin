export type PushRouteTarget =
  | { kind: 'join'; joinId: string }
  | { kind: 'notifications' }
  | { kind: 'none' };

/** Allowlisted deep-link mapping — never open arbitrary URLs from payload. */
export function resolvePushRoute(data: Record<string, unknown> | undefined): PushRouteTarget {
  if (!data) return { kind: 'none' };
  const joinId = typeof data.joinId === 'string' ? data.joinId : undefined;
  if (joinId && /^[0-9a-f-]{36}$/i.test(joinId)) {
    return { kind: 'join', joinId };
  }
  return { kind: 'notifications' };
}
