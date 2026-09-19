/**
 * 1:1 member messaging policy — admin-controllable singleton.
 * API is the enforcement SSOT; mobile may preview the same snapshot.
 */

export const MESSAGE_POLICY_SETTINGS_ID = 'default';

export type MessagePolicySnapshot = {
  enabled: boolean;
  premiumOnly: boolean;
  coinCostPerMessage: number;
  friendsOnly: boolean;
};

export const DEFAULT_MESSAGE_POLICY: MessagePolicySnapshot = {
  enabled: true,
  premiumOnly: false,
  coinCostPerMessage: 0,
  friendsOnly: false,
};

export type MessagePolicyDenial =
  | 'messaging_disabled'
  | 'self_message_forbidden'
  | 'premium_required'
  | 'friends_only'
  | 'blocked_user'
  | 'insufficient_available'
  | 'invalid_message_body';

export type EvaluateConversationAccessInput = {
  policy: MessagePolicySnapshot;
  fromUserId: string;
  toUserId: string;
  isPremiumActive: boolean;
  isAcceptedFriend: boolean;
  isBlockedEitherWay: boolean;
};

export type EvaluateSendMessagePolicyInput = EvaluateConversationAccessInput & {
  availableBalance: string;
};

export type EvaluateSendMessagePolicyResult =
  | { ok: true; coinCost: number }
  | { ok: false; code: MessagePolicyDenial };

export function normalizeMessagePolicy(
  input?: Partial<MessagePolicySnapshot> | null,
): MessagePolicySnapshot {
  const coinCost = Number(input?.coinCostPerMessage ?? DEFAULT_MESSAGE_POLICY.coinCostPerMessage);
  return {
    enabled: input?.enabled ?? DEFAULT_MESSAGE_POLICY.enabled,
    premiumOnly: input?.premiumOnly ?? DEFAULT_MESSAGE_POLICY.premiumOnly,
    coinCostPerMessage:
      Number.isFinite(coinCost) && coinCost >= 0 ? Math.floor(coinCost) : DEFAULT_MESSAGE_POLICY.coinCostPerMessage,
    friendsOnly: input?.friendsOnly ?? DEFAULT_MESSAGE_POLICY.friendsOnly,
  };
}

export function assertMessagePolicy(raw: MessagePolicySnapshot): MessagePolicySnapshot {
  const coinCost = Number(raw.coinCostPerMessage);
  if (!Number.isFinite(coinCost) || !Number.isInteger(coinCost) || coinCost < 0 || coinCost > 1_000_000) {
    throw new Error('invalid_coin_cost_per_message');
  }
  return {
    enabled: raw.enabled === true,
    premiumOnly: raw.premiumOnly === true,
    coinCostPerMessage: coinCost,
    friendsOnly: raw.friendsOnly === true,
  };
}

/**
 * Open/list access gate. Order: self → enabled → block → premium → friends.
 */
export function evaluateConversationAccess(
  input: EvaluateConversationAccessInput,
): EvaluateSendMessagePolicyResult {
  if (!input.fromUserId || !input.toUserId || input.fromUserId === input.toUserId) {
    return { ok: false, code: 'self_message_forbidden' };
  }
  const policy = normalizeMessagePolicy(input.policy);
  if (!policy.enabled) {
    return { ok: false, code: 'messaging_disabled' };
  }
  if (input.isBlockedEitherWay) {
    return { ok: false, code: 'blocked_user' };
  }
  if (policy.premiumOnly && !input.isPremiumActive) {
    return { ok: false, code: 'premium_required' };
  }
  if (policy.friendsOnly && !input.isAcceptedFriend) {
    return { ok: false, code: 'friends_only' };
  }
  return { ok: true, coinCost: policy.coinCostPerMessage };
}

/**
 * Pre-send gate. Access first, then available-balance when coinCost > 0.
 * coinCost 0 skips debit (DEV default).
 */
export function evaluateSendMessagePolicy(
  input: EvaluateSendMessagePolicyInput,
): EvaluateSendMessagePolicyResult {
  const access = evaluateConversationAccess(input);
  if (!access.ok) return access;
  const policy = normalizeMessagePolicy(input.policy);
  if (policy.coinCostPerMessage > 0) {
    const available = Number(input.availableBalance);
    if (!Number.isFinite(available) || available < policy.coinCostPerMessage) {
      return { ok: false, code: 'insufficient_available' };
    }
  }
  return { ok: true, coinCost: policy.coinCostPerMessage };
}

export function canOpenMemberMessaging(policy: MessagePolicySnapshot): boolean {
  return normalizeMessagePolicy(policy).enabled;
}
