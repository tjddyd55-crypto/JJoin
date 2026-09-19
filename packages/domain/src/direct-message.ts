/**
 * 1:1 DirectConversation helpers — pair uniqueness, unread, idempotency.
 * Join chat stays ephemeral and join-scoped; this module is persistent DMs.
 */

import { CHAT_MESSAGE_MAX_LENGTH, normalizeChatMessageBody } from './join-chat-loop';

export const DIRECT_MESSAGE_MAX_LENGTH = CHAT_MESSAGE_MAX_LENGTH;
export const DIRECT_MESSAGE_POLL_INTERVAL_MS = 5000;
export const DIRECT_MESSAGE_PREVIEW_MAX = 80;
export const DIRECT_MESSAGE_FEE_LEDGER_TYPE = 'DIRECT_MESSAGE_FEE';
export const DIRECT_MESSAGE_FEE_REF_TYPE = 'DIRECT_MESSAGE';

export type OrderedUserPair = {
  userLowId: string;
  userHighId: string;
};

export function orderDirectConversationPair(a: string, b: string): OrderedUserPair {
  if (!a || !b || a === b) {
    throw new Error('self_message_forbidden');
  }
  return a < b ? { userLowId: a, userHighId: b } : { userLowId: b, userHighId: a };
}

export function peerUserIdFromPair(pair: OrderedUserPair, viewerUserId: string): string {
  if (viewerUserId === pair.userLowId) return pair.userHighId;
  if (viewerUserId === pair.userHighId) return pair.userLowId;
  throw new Error('conversation_forbidden');
}

export function isConversationParticipant(pair: OrderedUserPair, userId: string): boolean {
  return userId === pair.userLowId || userId === pair.userHighId;
}

export function normalizeDirectMessageBody(raw: string): string {
  try {
    return normalizeChatMessageBody(raw);
  } catch (e) {
    const code = e instanceof Error ? e.message : '';
    if (code === 'chat_message_empty') throw new Error('invalid_message_body');
    if (code === 'chat_message_too_long') throw new Error('invalid_message_body');
    throw e;
  }
}

export function previewDirectMessage(body: string): string {
  const trimmed = body.trim();
  if (trimmed.length <= DIRECT_MESSAGE_PREVIEW_MAX) return trimmed;
  return `${trimmed.slice(0, DIRECT_MESSAGE_PREVIEW_MAX)}…`;
}

export function normalizeDirectMessageIdempotencyKey(clientKey: string, senderUserId: string): string {
  return `direct-message:${senderUserId}:${clientKey.trim()}`;
}

export function directMessageFeeIdempotencyKey(messageKey: string): string {
  return `${messageKey}:fee`;
}

export function countUnreadDirectMessages(input: {
  viewerUserId: string;
  lastReadAt: Date | string | null | undefined;
  messages: Array<{ senderUserId: string; createdAt: Date | string }>;
}): number {
  const lastReadMs = input.lastReadAt ? new Date(input.lastReadAt).getTime() : 0;
  return input.messages.filter((row) => {
    if (row.senderUserId === input.viewerUserId) return false;
    return new Date(row.createdAt).getTime() > lastReadMs;
  }).length;
}

export function isMessageUnreadForViewer(input: {
  viewerUserId: string;
  senderUserId: string;
  createdAt: Date | string;
  lastReadAt: Date | string | null | undefined;
}): boolean {
  if (input.senderUserId === input.viewerUserId) return false;
  const lastReadMs = input.lastReadAt ? new Date(input.lastReadAt).getTime() : 0;
  return new Date(input.createdAt).getTime() > lastReadMs;
}

export function directMessageReceivedEventKey(messageId: string): string {
  return `direct-message-received:${messageId}`;
}
