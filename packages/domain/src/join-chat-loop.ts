/**
 * Join attendance / urgent vacancy / ephemeral chat / invitation — pure domain SSOT.
 */

import { localDayKey } from './join-discovery';

export const CHAT_VISIBLE_GRACE_HOURS = 24;
export const CHAT_PURGE_AFTER_HOURS = 48;
export const CHAT_MESSAGE_MAX_LENGTH = 1000;
export const CHAT_POLL_INTERVAL_MS = 5000;
export const JOIN_INVITE_MAX_BATCH = 20;

/** Only COMPLETED co-participation counts toward “played together”. */
export const PLAYED_TOGETHER_ELIGIBLE_STATUS = 'COMPLETED' as const;

export type ChatRoomLifecycleStatus = 'ACTIVE' | 'READ_ONLY' | 'CLOSED';

const URGENT_JOINABLE_STATUSES = new Set(['OPEN', 'CONFIRMED', 'IN_PROGRESS']);
const CHAT_PARTICIPANT_STATUSES = new Set(['APPROVED', 'CONFIRMED']);

function asDate(value: Date | string): Date {
  return typeof value === 'string' ? new Date(value) : value;
}

function hoursAfter(from: Date, hours: number): Date {
  return new Date(from.getTime() + hours * 60 * 60_000);
}

/**
 * Host may open urgent vacancy when:
 * - start is today (KST)
 * - before start
 * - seats remaining (>0)
 * - joinable status (OPEN / CONFIRMED / IN_PROGRESS) — not FULL / CANCELLED / COMPLETED
 */
export function canActivateUrgentVacancy(input: {
  status: string;
  startAt: Date | string;
  plannedPlayerCount: number;
  confirmedPlayerCount: number;
  now?: Date | string;
  timeZone?: string;
}): boolean {
  const now = asDate(input.now ?? new Date());
  const startAt = asDate(input.startAt);
  const timeZone = input.timeZone ?? 'Asia/Seoul';

  if (!URGENT_JOINABLE_STATUSES.has(input.status)) return false;
  if (startAt.getTime() <= now.getTime()) return false;
  if (localDayKey(startAt, timeZone) !== localDayKey(now, timeZone)) return false;

  const seats = input.plannedPlayerCount - input.confirmedPlayerCount;
  return seats > 0;
}

/**
 * Clear urgent flag when no longer recruitable as urgent, or deadline passed.
 */
export function shouldClearUrgent(input: {
  isUrgent: boolean;
  status: string;
  planned: number;
  confirmed: number;
  startAt: Date | string;
  now?: Date | string;
  urgentUntil?: Date | string | null;
}): boolean {
  if (!input.isUrgent) return false;

  const now = asDate(input.now ?? new Date());
  const startAt = asDate(input.startAt);

  if (!URGENT_JOINABLE_STATUSES.has(input.status)) return true;
  if (input.status === 'FULL') return true;
  if (input.planned - input.confirmed <= 0) return true;
  if (startAt.getTime() <= now.getTime()) return true;
  if (input.urgentUntil && asDate(input.urgentUntil).getTime() <= now.getTime()) {
    return true;
  }
  return false;
}

/**
 * Chat access: host, or APPROVED/CONFIRMED participant.
 * CANCELLED / APPLIED blocked. DECLINED attendance intent blocks chat.
 */
export function canAccessJoinChat(input: {
  participationStatus: string | null | undefined;
  role: string | null | undefined;
  attendanceIntent?: string | null;
}): boolean {
  if (input.attendanceIntent === 'DECLINED') return false;
  if (input.role === 'HOST') return true;
  if (!input.participationStatus) return false;
  if (input.participationStatus === 'CANCELLED') return false;
  if (input.participationStatus === 'APPLIED') return false;
  return CHAT_PARTICIPANT_STATUSES.has(input.participationStatus);
}

/** Club member chat bridge — linked Join + ClubEvent attendance (no separate club chat). */
export function isClubEventChatEligibleAttendance(input: {
  response: string;
  finalStatus?: string | null;
  eventFinalized?: boolean;
}): boolean {
  if (input.finalStatus === 'NO_SHOW') return false;
  if (input.finalStatus === 'ATTENDED') return true;
  if (input.eventFinalized) return false;
  return input.response === 'ATTENDING';
}

export function canAccessClubLinkedJoinChat(input: {
  clubEventAttendance?: { response: string; finalStatus?: string | null } | null;
  eventFinalized?: boolean;
}): boolean {
  if (!input.clubEventAttendance) return false;
  return isClubEventChatEligibleAttendance({
    response: input.clubEventAttendance.response,
    finalStatus: input.clubEventAttendance.finalStatus,
    eventFinalized: input.eventFinalized,
  });
}

export function canAccessJoinChatWithClubBridge(input: {
  participationStatus: string | null | undefined;
  role: string | null | undefined;
  attendanceIntent?: string | null;
  clubBridge?: { response: string; finalStatus?: string | null; eventFinalized?: boolean } | null;
}): boolean {
  if (
    canAccessJoinChat({
      participationStatus: input.participationStatus,
      role: input.role,
      attendanceIntent: input.attendanceIntent,
    })
  ) {
    return true;
  }
  return canAccessClubLinkedJoinChat({
    clubEventAttendance: input.clubBridge ?? null,
    eventFinalized: input.clubBridge?.eventFinalized,
  });
}

/**
 * Whether chat entry should appear in product UI.
 * Hidden after hideAfter (grace) or when room is CLOSED (purged).
 * Write access is separate (`resolveChatRoomLifecycleStatus` / canPost).
 */
export function isJoinChatVisibleInUi(input: {
  hasRoom: boolean;
  roomStatus?: string | null;
  hideAfter?: Date | string | null;
  now?: Date | string;
}): boolean {
  if (!input.hasRoom) return false;
  if (input.roomStatus === 'CLOSED') return false;
  if (input.hideAfter) {
    const now = asDate(input.now ?? new Date());
    if (asDate(input.hideAfter).getTime() <= now.getTime()) return false;
  }
  return true;
}

/**
 * Desired room lifecycle from join status + schedule.
 * CLOSED once past scheduledEndAt + CHAT_PURGE_AFTER_HOURS.
 * READ_ONLY when terminal join or past scheduledEndAt.
 */
export function resolveChatRoomLifecycleStatus(
  joinStatus: string,
  now: Date | string,
  scheduledEndAt: Date | string,
): ChatRoomLifecycleStatus {
  const nowDate = asDate(now);
  const endAt = asDate(scheduledEndAt);
  const purgeAt = hoursAfter(endAt, CHAT_PURGE_AFTER_HOURS);

  if (nowDate.getTime() >= purgeAt.getTime()) return 'CLOSED';

  const terminal = joinStatus === 'COMPLETED' || joinStatus === 'CANCELLED';
  if (terminal || nowDate.getTime() >= endAt.getTime()) return 'READ_ONLY';

  return 'ACTIVE';
}

export function chatHideAfterFrom(anchor: Date | string): Date {
  return hoursAfter(asDate(anchor), CHAT_VISIBLE_GRACE_HOURS);
}

export function chatPurgeAfterFrom(anchor: Date | string): Date {
  return hoursAfter(asDate(anchor), CHAT_PURGE_AFTER_HOURS);
}

/**
 * Trim, reject empty, enforce max length.
 * Returns normalized body or throws Error with code message.
 */
export function normalizeChatMessageBody(raw: string): string {
  const body = typeof raw === 'string' ? raw.trim() : '';
  if (!body) {
    throw new Error('chat_message_empty');
  }
  if (body.length > CHAT_MESSAGE_MAX_LENGTH) {
    throw new Error('chat_message_too_long');
  }
  return body;
}

export function urgentJoinNotificationEventKey(userId: string, joinId: string): string {
  return `urgent-join:${userId}:${joinId}`;
}

export function joinInvitationNotificationEventKey(
  userId: string,
  invitationId: string,
): string {
  return `join-invite:${userId}:${invitationId}`;
}

export function joinAttendanceConfirmEventKey(userId: string, joinId: string): string {
  return `join-attendance-confirm:${userId}:${joinId}`;
}

export function joinChatSystemNotificationEventKey(
  userId: string,
  joinId: string,
  kind: string,
): string {
  return `join-chat-system:${userId}:${joinId}:${kind}`;
}
