import {
  resolveNotificationRoute as resolveDomainNotificationRoute,
  resolvePushRoute as resolveDomainPushRoute,
  type NotificationRouteTarget,
} from '@jjoin/domain';
import type { NotificationType } from '@jjoin/types';

export type PushRouteTarget = NotificationRouteTarget;

/** Allowlisted deep-link mapping — domain SSOT. */
export function resolvePushRoute(data: Record<string, unknown> | undefined): PushRouteTarget {
  return resolveDomainPushRoute(data);
}

export function resolveNotificationRoute(item: {
  type: NotificationType | string;
  data?: Record<string, unknown> | null;
}): PushRouteTarget {
  return resolveDomainNotificationRoute({
    type: String(item.type),
    data: item.data ?? undefined,
  });
}
