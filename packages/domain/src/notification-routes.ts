/**
 * Notification tap / push deep-link SSOT.
 * Mobile and API share this map. Never open arbitrary URLs from payload.
 */

export type NotificationRouteTarget =
  | { kind: 'join'; joinId: string }
  | { kind: 'wallet' }
  | { kind: 'wallet-transactions' }
  | { kind: 'club'; clubId: string }
  | { kind: 'club-notice'; clubId: string; noticeId?: string }
  | { kind: 'golf-friends' }
  | { kind: 'user'; userId: string }
  | { kind: 'conversation'; conversationId: string }
  | { kind: 'notifications' }
  | { kind: 'unavailable' }
  | { kind: 'none' };

const UUID_RE = /^[0-9a-f-]{36}$/i;

function uuidField(data: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = data?.[key];
  if (typeof value === 'string' && UUID_RE.test(value)) return value;
  return undefined;
}

export function resolvePushRoute(data: Record<string, unknown> | undefined): NotificationRouteTarget {
  if (!data) return { kind: 'none' };
  const type = typeof data.type === 'string' ? data.type : '';
  return resolveNotificationRoute({ type, data });
}

export function resolveNotificationRoute(item: {
  type: string;
  data?: Record<string, unknown> | null;
}): NotificationRouteTarget {
  const data = (item.data ?? undefined) as Record<string, unknown> | undefined;
  const type = item.type;

  if (type === 'DIRECT_MESSAGE_RECEIVED') {
    const conversationId = uuidField(data, 'conversationId');
    return conversationId ? { kind: 'conversation', conversationId } : { kind: 'notifications' };
  }

  if (type === 'FRIEND_REQUEST_RECEIVED' || type === 'FRIEND_REQUEST_ACCEPTED') {
    const userId = uuidField(data, 'userId');
    return userId ? { kind: 'user', userId } : { kind: 'golf-friends' };
  }

  if (isWalletType(type)) return { kind: 'wallet' };

  const joinId = uuidField(data, 'joinId');
  if (joinId && !type.startsWith('CLUB_')) return { kind: 'join', joinId };

  const clubId = uuidField(data, 'clubId');
  if (clubId) {
    if (type === 'CLUB_NOTICE') {
      return { kind: 'club-notice', clubId, noticeId: uuidField(data, 'noticeId') };
    }
    return { kind: 'club', clubId };
  }

  if (type.startsWith('CLUB_')) return { kind: 'notifications' };
  if (joinId) return { kind: 'join', joinId };
  return type ? { kind: 'notifications' } : { kind: 'none' };
}

function isWalletType(type: string): boolean {
  return (
    type === 'REWARD_PAID' ||
    type === 'REWARD_AUTO_PAID' ||
    type === 'SETTLEMENT_CONFIRMATION_REQUIRED' ||
    type === 'COIN_GIFT_RECEIVED' ||
    type === 'COIN_PURCHASE_COMPLETED'
  );
}
