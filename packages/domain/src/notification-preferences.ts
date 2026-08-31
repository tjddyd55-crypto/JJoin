/**
 * Maps notification types to granular user preference fields.
 * Push delivery skips when preference is off; in-app record may still exist.
 */

export type NotificationPreferenceFields = {
  joinAlertsEnabled: boolean;
  followedStoreEnabled: boolean;
  urgentJoinEnabled: boolean;
  invitationEnabled: boolean;
  attendanceReminderEnabled: boolean;
  bookmarkUpdatesEnabled: boolean;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferenceFields = {
  joinAlertsEnabled: true,
  followedStoreEnabled: true,
  urgentJoinEnabled: true,
  invitationEnabled: true,
  attendanceReminderEnabled: true,
  bookmarkUpdatesEnabled: true,
};

export type PushPreferenceNotificationType =
  | 'JOIN_ALERT_MATCH'
  | 'FOLLOWED_STORE_NEW_JOIN'
  | 'URGENT_JOIN_OPENED'
  | 'JOIN_INVITATION'
  | 'JOIN_STARTING_SOON'
  | 'JOIN_ATTENDANCE_CONFIRM_REQUIRED'
  | 'BOOKMARK_JOIN_CLOSING'
  | 'BOOKMARK_JOIN_SPOT_LEFT'
  | 'BOOKMARK_JOIN_UPDATED'
  | 'BOOKMARK_JOIN_CANCELLED';

const PREFERENCE_FIELD: Record<PushPreferenceNotificationType, keyof NotificationPreferenceFields> =
  {
    JOIN_ALERT_MATCH: 'joinAlertsEnabled',
    FOLLOWED_STORE_NEW_JOIN: 'followedStoreEnabled',
    URGENT_JOIN_OPENED: 'urgentJoinEnabled',
    JOIN_INVITATION: 'invitationEnabled',
    JOIN_STARTING_SOON: 'attendanceReminderEnabled',
    JOIN_ATTENDANCE_CONFIRM_REQUIRED: 'attendanceReminderEnabled',
    BOOKMARK_JOIN_CLOSING: 'bookmarkUpdatesEnabled',
    BOOKMARK_JOIN_SPOT_LEFT: 'bookmarkUpdatesEnabled',
    BOOKMARK_JOIN_UPDATED: 'bookmarkUpdatesEnabled',
    BOOKMARK_JOIN_CANCELLED: 'bookmarkUpdatesEnabled',
  };

/** Returns true when tray push should be attempted for this notification type. */
export function shouldDeliverPushForType(
  type: string,
  prefs: NotificationPreferenceFields,
  masterPushEnabled: boolean,
): boolean {
  if (!masterPushEnabled) return false;
  const field = PREFERENCE_FIELD[type as PushPreferenceNotificationType];
  if (!field) return true;
  return prefs[field];
}
