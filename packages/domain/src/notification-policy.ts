/**
 * Unified notification policy SSOT — types, defaults, rate limits, keys.
 * Inbox Notification is SSOT; OS push is delivery only.
 */

export const SCREEN_NOTIFICATION_RADIUS_OPTIONS = [5, 10, 15, 30] as const;

export type ScreenNotificationRadiusKm = (typeof SCREEN_NOTIFICATION_RADIUS_OPTIONS)[number];

export type ScreenNotificationRadiusMode =
  | 'KM_5'
  | 'KM_10'
  | 'KM_15'
  | 'KM_30'
  | 'SAME_ADMIN_REGION';

export type FieldNotificationRegionMode = 'AUTO' | 'CUSTOM';

export type FieldNotificationRegion = {
  province: string;
  cityCounty: string | null;
};

export const DEFAULT_SCREEN_NOTIFICATION_RADIUS_KM = 15;
export const DEFAULT_SCREEN_NOTIFICATION_RADIUS_MODE: ScreenNotificationRadiusMode = 'KM_15';
export const DEFAULT_FIELD_NOTIFICATION_REGION_MODE: FieldNotificationRegionMode = 'AUTO';
export const MAX_CUSTOM_FIELD_NOTIFICATION_REGIONS = 20;

/** JOIN_CREATED only. Direct events are never dropped by this config. */
export const JOIN_CREATED_RATE_LIMIT = {
  maxPerRecipient: 8,
  windowMinutes: 60,
} as const;

export const NOTIFICATION_OUTBOX_MAX_ATTEMPTS = 5;
export const NOTIFICATION_OUTBOX_BACKOFF_MS = [30_000, 120_000, 600_000, 1_800_000, 3_600_000] as const;
export const NOTIFICATION_OUTBOX_STALE_PROCESSING_MS = 5 * 60_000;
export const JOIN_CREATED_AUDIENCE_BATCH_SIZE = 200;

/** Structure only — UX and worker skip are deferred. */
export type QuietHoursWindow = {
  enabled: boolean;
  startMinutes: number | null;
  endMinutes: number | null;
};

export const DEFAULT_QUIET_HOURS: QuietHoursWindow = {
  enabled: false,
  startMinutes: null,
  endMinutes: null,
};

export type NotificationInboxCategory =
  | 'message'
  | 'friend'
  | 'join'
  | 'settlement'
  | 'club'
  | 'other';

export const NOTIFICATION_INBOX_CATEGORY_LABEL: Record<NotificationInboxCategory, string> = {
  message: '메시지',
  friend: '친구',
  join: '조인',
  settlement: '정산',
  club: '동호회',
  other: '기타',
};

const CATEGORY_BY_TYPE: Record<string, NotificationInboxCategory> = {
  DIRECT_MESSAGE_RECEIVED: 'message',
  JOIN_CHAT_SYSTEM: 'message',
  FRIEND_REQUEST_RECEIVED: 'friend',
  FRIEND_REQUEST_ACCEPTED: 'friend',
  CLUB_JOIN_APPROVED: 'club',
  CLUB_JOIN_REQUESTED: 'club',
  CLUB_JOIN_REJECTED: 'club',
  CLUB_EVENT_CREATED: 'club',
  CLUB_NOTICE: 'club',
  REWARD_PAID: 'settlement',
  REWARD_AUTO_PAID: 'settlement',
  SETTLEMENT_CONFIRMATION_REQUIRED: 'settlement',
  DISPUTE_OPENED: 'settlement',
  DISPUTE_RESOLVED: 'settlement',
  COIN_GIFT_RECEIVED: 'settlement',
  COIN_PURCHASE_COMPLETED: 'settlement',
  ATTENDANCE_REWARD: 'settlement',
  ACHIEVEMENT_REWARD: 'settlement',
};

export function notificationInboxCategory(type: string): NotificationInboxCategory {
  if (CATEGORY_BY_TYPE[type]) return CATEGORY_BY_TYPE[type];
  if (type.startsWith('CLUB_')) return 'club';
  if (type.startsWith('JOIN_') || type.startsWith('BOOKMARK_') || type.startsWith('WAITLIST_')) {
    return 'join';
  }
  if (type.startsWith('PREMIUM_') || type.startsWith('REWARD_') || type.startsWith('DISPUTE_')) {
    return 'settlement';
  }
  return 'other';
}

export function isRecommendationNotificationType(type: string): boolean {
  return (
    type === 'JOIN_CREATED' ||
    type === 'JOIN_ALERT_MATCH' ||
    type === 'JOIN_RECOMMENDATION' ||
    type === 'FOLLOWED_STORE_NEW_JOIN' ||
    type === 'PROFILE_MATCH_JOIN' ||
    type === 'URGENT_JOIN_OPENED'
  );
}

export function screenRadiusModeToKm(
  mode: ScreenNotificationRadiusMode,
): ScreenNotificationRadiusKm | null {
  if (mode === 'SAME_ADMIN_REGION') return null;
  const km = Number(mode.replace('KM_', ''));
  return SCREEN_NOTIFICATION_RADIUS_OPTIONS.includes(km as ScreenNotificationRadiusKm)
    ? (km as ScreenNotificationRadiusKm)
    : DEFAULT_SCREEN_NOTIFICATION_RADIUS_KM;
}

export function screenRadiusKmToMode(km: number): ScreenNotificationRadiusMode {
  if (km === 5) return 'KM_5';
  if (km === 10) return 'KM_10';
  if (km === 30) return 'KM_30';
  return 'KM_15';
}

export function isValidScreenRadiusMode(value: unknown): value is ScreenNotificationRadiusMode {
  return (
    value === 'KM_5' ||
    value === 'KM_10' ||
    value === 'KM_15' ||
    value === 'KM_30' ||
    value === 'SAME_ADMIN_REGION'
  );
}

export function isValidFieldRegionMode(value: unknown): value is FieldNotificationRegionMode {
  return value === 'AUTO' || value === 'CUSTOM';
}

export type NotificationEventKeyInput = {
  type: string;
  recipientUserId: string;
  targetEntityId: string;
  messageId?: string;
  /** Stable per mutation. Distinct JOIN_UPDATED edits must not share a key. */
  operationId?: string;
};

export function buildNotificationEventKey(input: NotificationEventKeyInput): string {
  if (input.messageId) {
    return `${input.type}:${input.recipientUserId}:${input.targetEntityId}:${input.messageId}`;
  }
  if (input.operationId) {
    return `${input.type}:${input.recipientUserId}:${input.targetEntityId}:${input.operationId}`;
  }
  return `${input.type}:${input.recipientUserId}:${input.targetEntityId}`;
}

export function canonicalizeNotificationMutation(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalizeNotificationMutation(item)).join(',')}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record)
    .filter((key) => record[key] !== undefined)
    .sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${canonicalizeNotificationMutation(record[key])}`)
    .join(',')}}`;
}

function stableMutationHash(input: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x811c9dc5 ^ 0xabcdef01;
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= code;
    h2 = Math.imul(h2, 0x01000193);
  }
  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

/**
 * JOIN_UPDATED operation id: previous `updatedAt` + canonical mutation hash.
 * Same update retry (same prior timestamp + same payload) stays idempotent.
 * A later distinct edit has a new prior `updatedAt` and/or payload, so it does not dedupe.
 */
export function buildJoinUpdateOperationId(input: {
  previousUpdatedAt: string | Date;
  mutation: unknown;
}): string {
  const previousUpdatedAt =
    input.previousUpdatedAt instanceof Date
      ? input.previousUpdatedAt.toISOString()
      : input.previousUpdatedAt;
  return stableMutationHash(`${previousUpdatedAt}:${canonicalizeNotificationMutation(input.mutation)}`);
}

export function buildAndroidCollapseKey(type: string, targetEntityId: string): string {
  if (type === 'DIRECT_MESSAGE_RECEIVED') return `dm:${targetEntityId}`;
  return `${type}:${targetEntityId}`.slice(0, 64);
}

export const NOTIFICATION_METRIC_NAMES = {
  enqueued: 'notification_enqueued',
  enqueueDeduped: 'notification_enqueue_deduped',
  pushSent: 'notification_push_sent',
  pushRetry: 'notification_push_retry',
  pushFailedTerminal: 'notification_push_failed_terminal',
  pushSkippedPreference: 'notification_push_skipped_preference',
  joinCreatedRateLimited: 'notification_join_created_rate_limited',
  joinCreatedAudience: 'notification_join_created_audience',
} as const;

export type NotificationMetricName =
  (typeof NOTIFICATION_METRIC_NAMES)[keyof typeof NOTIFICATION_METRIC_NAMES];

const metricCounters = new Map<string, number>();

export function incrementNotificationCounter(name: NotificationMetricName, by = 1): number {
  const next = (metricCounters.get(name) ?? 0) + by;
  metricCounters.set(name, next);
  return next;
}

export function readNotificationCounter(name: NotificationMetricName): number {
  return metricCounters.get(name) ?? 0;
}

export function resetNotificationCounters(): void {
  metricCounters.clear();
}

export function isWithinQuietHours(window: QuietHoursWindow, nowMinutes: number): boolean {
  if (!window.enabled || window.startMinutes == null || window.endMinutes == null) {
    return false;
  }
  const start = window.startMinutes;
  const end = window.endMinutes;
  if (start === end) return false;
  if (start < end) return nowMinutes >= start && nowMinutes < end;
  return nowMinutes >= start || nowMinutes < end;
}

export function formatUnreadBadge(count: number): string {
  if (count <= 0) return '';
  return count > 99 ? '99+' : String(count);
}
