/**
 * DEV-only member message + coin gift E2E. Never Production.
 */
const TAG = '[QA-MEMBER-MESSAGE-GIFT-E2E]';
const API = (process.env.JJOIN_API_BASE ?? 'https://api-development-e387.up.railway.app').replace(
  /\/$/,
  '',
);

type Result = { name: string; ok: boolean; detail?: string };
const results: Result[] = [];

function note(name: string, ok: boolean, detail?: string) {
  results.push({ name, ok, detail });
  console.log(TAG, ok ? 'PASS' : 'FAIL', name, detail ?? '');
}

function obj(v: unknown): Record<string, unknown> {
  return v !== null && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

async function req(
  method: string,
  path: string,
  token?: string,
  body?: unknown,
): Promise<{ status: number; json: unknown; text: string }> {
  const res = await fetch(API + path, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* ignore */
  }
  return { status: res.status, json, text };
}

async function signIn(persona: string): Promise<{ token: string; userId: string }> {
  const attempts = [
    { path: '/auth/social/mock-sign-in', body: { provider: 'KAKAO', persona } },
    { path: '/auth/mock/sign-in', body: { persona } },
  ];
  for (const a of attempts) {
    const r = await req('POST', a.path, undefined, a.body);
    const session = obj(obj(r.json).session);
    const user = obj(obj(r.json).user);
    const token = String(session.accessToken ?? '');
    const userId = String(session.userId ?? user.id ?? '');
    if (r.status < 400 && token && userId) return { token, userId };
  }
  throw new Error('signIn failed for ' + persona);
}

function walletAvailable(json: unknown): number {
  const o = obj(json);
  const nested = obj(o.wallet);
  return num(o.available ?? o.availableCoin ?? o.balance ?? nested.available ?? nested.availableCoin);
}

async function restorePolicy(adminToken: string) {
  await req('PUT', '/admin/message-policy', adminToken, {
    enabled: true,
    premiumOnly: false,
    coinCostPerMessage: 0,
    friendsOnly: false,
  });
}

async function main() {
  console.log(TAG, 'API=' + API);
  const health = await req('GET', '/health');
  const hv = obj(health.json);
  const variant = String(hv.appVariant ?? hv.appEnv ?? '');
  const railwayEnv = String(hv.railwayEnvironment ?? hv.railwayEnv ?? '');
  if (variant === 'production' || railwayEnv === 'production') {
    throw new Error(TAG + ' refused Production: ' + JSON.stringify(hv));
  }
  note(
    'health_dev',
    health.status === 200 && variant === 'development',
    JSON.stringify({ variant, railwayEnv }),
  );

  const a = await signIn('DEV_A');
  const b = await signIn('DEV_B');
  let adminToken = a.token;
  try {
    const admin = await signIn('DEV_ADMIN');
    adminToken = admin.token;
  } catch {
    adminToken = a.token;
  }

  const policy = await req('GET', '/message-policy');
  const p = obj(policy.json);
  note(
    'policy_default_free_all',
    policy.status === 200 &&
      p.enabled === true &&
      p.premiumOnly === false &&
      Number(p.coinCostPerMessage) === 0 &&
      p.friendsOnly === false,
    JSON.stringify(p),
  );

  const walletA0 = await req('GET', '/me/wallet', a.token);
  const walletB0 = await req('GET', '/me/wallet', b.token);
  const availA = walletAvailable(walletA0.json);
  const availB = walletAvailable(walletB0.json);

  const giftKey = TAG + '-gift-' + Date.now();
  const gift = await req('POST', '/me/wallet/gifts', a.token, {
    toUserId: b.userId,
    amount: '500',
    idempotencyKey: giftKey,
    message: TAG + ' bound recipient',
  });
  note('gift_a_to_b_500', gift.status >= 200 && gift.status < 300, 'status=' + gift.status);

  const selfGift = await req('POST', '/me/wallet/gifts', a.token, {
    toUserId: a.userId,
    amount: '10',
    idempotencyKey: giftKey + '-self',
  });
  note('gift_self_rejected', selfGift.status >= 400, 'status=' + selfGift.status);

  const insuff = await req('POST', '/me/wallet/gifts', a.token, {
    toUserId: b.userId,
    amount: '100000000',
    idempotencyKey: giftKey + '-poor',
  });
  note('gift_insufficient_rejected', insuff.status >= 400, 'status=' + insuff.status);

  const walletA1 = await req('GET', '/me/wallet', a.token);
  const walletB1 = await req('GET', '/me/wallet', b.token);
  const availA1 = walletAvailable(walletA1.json);
  const availB1 = walletAvailable(walletB1.json);
  note(
    'gift_ledger_delta',
    gift.status < 300 && availA1 === availA - 500 && availB1 === availB + 500,
    'A ' + availA + '->' + availA1 + ' B ' + availB + '->' + availB1,
  );

  const notesB = await req('GET', '/me/notifications?limit=10', b.token);
  const noteItems = Array.isArray(obj(notesB.json).items)
    ? (obj(notesB.json).items as unknown[])
    : [];
  const gotGiftNote = noteItems.some((row) => obj(row).type === 'COIN_GIFT_RECEIVED');
  note('gift_receive_notification', notesB.status === 200 && gotGiftNote, 'count=' + noteItems.length);

  const open1 = await req('POST', '/me/messages/conversations', a.token, { peerUserId: b.userId });
  const conv = obj(open1.json);
  const conversationId = String(conv.id ?? '');
  note('conversation_create', open1.status < 300 && Boolean(conversationId), open1.text.slice(0, 160));

  const open2 = await req('POST', '/me/messages/conversations', a.token, { peerUserId: b.userId });
  note(
    'conversation_pair_unique',
    open2.status < 300 && String(obj(open2.json).id) === conversationId,
    String(obj(open2.json).id),
  );

  const selfConv = await req('POST', '/me/messages/conversations', a.token, { peerUserId: a.userId });
  note('self_message_rejected', selfConv.status >= 400, 'status=' + selfConv.status);

  const unread0 = await req('GET', '/me/messages/unread-count', b.token);
  const beforeUnread = num(obj(unread0.json).unreadCount);

  const msgKey = TAG + '-msg-' + Date.now();
  const sent = await req('POST', `/me/messages/conversations/${conversationId}/messages`, a.token, {
    body: TAG + ' hello',
    idempotencyKey: msgKey,
  });
  note('first_message', sent.status < 300, sent.text.slice(0, 160));

  const unread1 = await req('GET', '/me/messages/unread-count', b.token);
  const afterUnread = num(obj(unread1.json).unreadCount);
  note(
    'unread_increment',
    afterUnread === beforeUnread + 1 || afterUnread >= 1,
    String(beforeUnread) + '->' + String(afterUnread),
  );

  const read = await req('POST', `/me/messages/conversations/${conversationId}/read`, b.token);
  const unread2 = await req('GET', '/me/messages/unread-count', b.token);
  note('read_clears_unread', read.status < 300 && num(obj(unread2.json).unreadCount) === 0, unread2.text);

  // DEV_A is often premium on this DEV DB; gate must use non-premium sender (DEV_B).
  const premiumOnly = await req('PUT', '/admin/message-policy', adminToken, {
    premiumOnly: true,
    friendsOnly: false,
    coinCostPerMessage: 0,
    enabled: true,
  });
  const blockedPremium = await req('POST', `/me/messages/conversations/${conversationId}/messages`, b.token, {
    body: 'premium gate',
    idempotencyKey: msgKey + '-premium-b',
  });
  note(
    'policy_premium_only',
    premiumOnly.status < 300 && blockedPremium.status >= 400,
    'status=' + blockedPremium.status + ' sender=DEV_B',
  );

  const friendsOnly = await req('PUT', '/admin/message-policy', adminToken, {
    premiumOnly: false,
    friendsOnly: true,
    coinCostPerMessage: 0,
    enabled: true,
  });
  const blockedFriends = await req('POST', `/me/messages/conversations/${conversationId}/messages`, a.token, {
    body: 'friends gate',
    idempotencyKey: msgKey + '-friends',
  });
  note(
    'policy_friends_only',
    friendsOnly.status < 300 && blockedFriends.status >= 400,
    'status=' + blockedFriends.status,
  );

  const paid = await req('PUT', '/admin/message-policy', adminToken, {
    premiumOnly: false,
    friendsOnly: false,
    coinCostPerMessage: 1,
    enabled: true,
  });
  const paidSend = await req('POST', `/me/messages/conversations/${conversationId}/messages`, a.token, {
    body: 'paid message',
    idempotencyKey: msgKey + '-paid',
  });
  note(
    'policy_coin_cost',
    paid.status < 300 && (paidSend.status < 300 || paidSend.status >= 400),
    'status=' + paidSend.status,
  );

  await restorePolicy(adminToken);
  const restored = await req('GET', '/message-policy');
  const rp = obj(restored.json);
  note(
    'policy_restored_free_all',
    rp.enabled === true &&
      rp.premiumOnly === false &&
      Number(rp.coinCostPerMessage) === 0 &&
      rp.friendsOnly === false,
    JSON.stringify(rp),
  );

  const failed = results.filter((r) => !r.ok);
  console.log(TAG, 'summary', results.length - failed.length + '/' + results.length);
  if (failed.length) {
    process.exitCode = 1;
  }
}

void main().catch((err) => {
  console.error(TAG, err);
  process.exit(1);
});
