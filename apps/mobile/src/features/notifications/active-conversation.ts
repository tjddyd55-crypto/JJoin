/** Local FG chat presence — not a server presence system. */

let activeConversationId: string | null = null;

export function setActiveConversationForPush(conversationId: string | null): void {
  activeConversationId = conversationId;
}

export function getActiveConversationForPush(): string | null {
  return activeConversationId;
}

export function shouldSuppressOsPushForActiveChat(data: Record<string, unknown> | undefined): boolean {
  if (!data || data.type !== 'DIRECT_MESSAGE_RECEIVED') return false;
  const conversationId = typeof data.conversationId === 'string' ? data.conversationId : '';
  return Boolean(conversationId && conversationId === activeConversationId);
}
