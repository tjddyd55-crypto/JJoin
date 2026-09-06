import type { NotificationType } from '@jjoin/types';

export type PushRouteTarget =
  | { kind: 'join'; joinId: string }
  | { kind: 'wallet' }
  | { kind: 'wallet-transactions' }
  | { kind: 'club'; clubId: string }
  | { kind: 'club-notice'; clubId: string; noticeId?: string }
  | { kind: 'golf-friends' }
  | { kind: 'user'; userId: string }
  | { kind: 'notifications' }
  | { kind: 'none' };

const UUID_RE = /^[0-9a-f-]{36}$/i;

/** Allowlisted deep-link mapping — never open arbitrary URLs from payload. */
export function resolvePushRoute(data: Record<string, unknown> | undefined): PushRouteTarget {
  if (!data) return { kind: 'none' };

  const type = typeof data.type === 'string' ? data.type : '';
  if (type === 'FRIEND_REQUEST_RECEIVED' || type === 'FRIEND_REQUEST_ACCEPTED') {
    const userId = typeof data.userId === 'string' ? data.userId : undefined;
    if (userId && UUID_RE.test(userId)) {
      return { kind: 'user', userId };
    }
    return { kind: 'golf-friends' };
  }
  if (
    type === 'REWARD_PAID' ||
    type === 'REWARD_AUTO_PAID' ||
    type === 'SETTLEMENT_CONFIRMATION_REQUIRED'
  ) {
    return { kind: 'wallet' };
  }

  const joinId = typeof data.joinId === 'string' ? data.joinId : undefined;
  if (joinId && UUID_RE.test(joinId)) {
    return { kind: 'join', joinId };
  }

  const clubId = typeof data.clubId === 'string' ? data.clubId : undefined;
  const noticeId = typeof data.noticeId === 'string' ? data.noticeId : undefined;
  if (clubId && UUID_RE.test(clubId)) {
    if (noticeId && UUID_RE.test(noticeId)) {
      return { kind: 'club-notice', clubId, noticeId };
    }
    return { kind: 'club', clubId };
  }

  return { kind: 'notifications' };
}

export function resolveNotificationRoute(
  item: { type: NotificationType | string; data?: Record<string, unknown> | null },
): PushRouteTarget {
  const data = (item.data ?? undefined) as Record<string, unknown> | undefined;
  const routed = resolvePushRoute({ ...data, type: item.type });
  if (routed.kind !== 'notifications' && routed.kind !== 'none') return routed;

  if (String(item.type).startsWith('CLUB_')) {
    const clubId = typeof data?.clubId === 'string' ? data.clubId : undefined;
    if (clubId && UUID_RE.test(clubId)) {
      if (item.type === 'CLUB_NOTICE') {
        const noticeId = typeof data?.noticeId === 'string' ? data.noticeId : undefined;
        return { kind: 'club-notice', clubId, noticeId };
      }
      return { kind: 'club', clubId };
    }
  }

  return routed;
}
