/**
 * Billing / Premium / Join Pricing DEV E2E — Railway development API.
 *
 * Usage:
 *   pnpm exec tsx scripts/billing-premium-dev-e2e.ts
 *   pnpm exec tsx scripts/billing-premium-dev-e2e.ts --coin-confirm
 *   pnpm exec tsx scripts/billing-premium-dev-e2e.ts --case-d
 *   pnpm exec tsx scripts/billing-premium-dev-e2e.ts --join-retry
 *   pnpm exec tsx scripts/billing-premium-dev-e2e.ts --renewal-cron
 *   pnpm exec tsx scripts/billing-premium-dev-e2e.ts --live-missing
 *   pnpm exec tsx scripts/billing-premium-dev-e2e.ts --policy-matrix
 *   pnpm exec tsx scripts/billing-premium-dev-e2e.ts --permission-separation
 *   pnpm exec tsx scripts/billing-premium-dev-e2e.ts --premium-cancel
 */
import { JoinMethod, MockAuthPersona, SCREEN_GOLF_CODE, SocialProvider } from '../packages/types/src/index.ts';
import { clearPremiumMembership, seedPremiumMembership, withBillingPrisma } from './billing-dev-fixtures.ts';

const API = (process.env.API_BASE ?? 'https://api-development-e387.up.railway.app').replace(/\/$/, '');

type Auth = { Authorization: string };

async function j<T>(path: string, init?: RequestInit): Promise<{ status: number; body: T; raw: string }> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const raw = await res.text();
  let body: T;
  try {
    body = JSON.parse(raw) as T;
  } catch {
    body = raw as T;
  }
  return { status: res.status, body, raw };
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function adminAuth(): Promise<Auth> {
  const loginId = process.env.JJOIN_ADMIN_LOGIN_ID;
  const password = process.env.JJOIN_ADMIN_LOGIN_PASSWORD;
  assert(loginId && password, 'Set JJOIN_ADMIN_LOGIN_ID and JJOIN_ADMIN_LOGIN_PASSWORD');
  const sign = await j<{ session: { accessToken: string } }>('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ loginId, password }),
  });
  assert(sign.status < 300, `admin login ${sign.status}`);
  return { Authorization: `Bearer ${sign.body.session.accessToken}` };
}

async function signIn(persona: MockAuthPersona): Promise<{ auth: Auth; userId: string }> {
  const sign = await j<{ session: { accessToken: string; userId: string } }>('/auth/social/mock-sign-in', {
    method: 'POST',
    body: JSON.stringify({ provider: SocialProvider.KAKAO, persona }),
  });
  assert(sign.status < 300, `sign-in ${persona} ${sign.status}`);
  return {
    auth: { Authorization: `Bearer ${sign.body.session.accessToken}` },
    userId: sign.body.session.userId,
  };
}

async function walletBalance(auth: Auth): Promise<number> {
  const w = await j<{ availableCoin: string }>('/me/wallet', { headers: auth });
  assert(w.status === 200, `wallet ${w.status}`);
  return Number(w.body.availableCoin);
}

type PricingPolicy = {
  baseMode: string;
  baseFeeCoinAmount: number;
  ownerOverride: string;
  ownerFixedFeeCoinAmount: number;
  premiumOverride: string;
  premiumFixedFeeCoinAmount: number;
};

async function setJoinPricing(admin: Auth, policy: PricingPolicy) {
  const res = await j<PricingPolicy>('/admin/join-coin-policy', {
    method: 'PUT',
    headers: admin,
    body: JSON.stringify(policy),
  });
  assert(res.status === 200, `join pricing update ${res.status}`);
}

async function meJoinPolicy(auth: Auth) {
  const res = await j<{ creationCoinCost: string; effectivePolicy?: { effectiveFeeCoinAmount: number } }>(
    '/me/join-coin-policy',
    { headers: auth },
  );
  assert(res.status === 200, `me join policy ${res.status}`);
  return res.body;
}

async function verifyPaymentConfig(admin: Auth) {
  const s = await j<{
    environment: string;
    enabled: boolean;
    clientKey: string | null;
    hasSecretKey: boolean;
    secretKeyMasked: string | null;
  }>('/admin/payment-settings', { headers: admin });
  assert(s.status === 200, 'settings');
  assert(s.body.environment === 'TEST', 'TEST env');
  assert(s.body.enabled, 'enabled');
  assert(s.body.clientKey, 'clientKey');
  assert(s.body.hasSecretKey, 'hasSecret');
  assert(s.body.secretKeyMasked?.includes('*'), 'masked');
  console.log('OK payment config', {
    environment: s.body.environment,
    enabled: s.body.enabled,
    secretMasked: Boolean(s.body.secretKeyMasked),
  });
}

async function verifyCoinProducts() {
  const products = await j<Array<{ id: string; code: string; price: number; coinAmount: string | null; active: boolean }>>(
    '/payment-products?type=COIN_CHARGE',
  );
  assert(products.status === 200, 'products');
  const coin10 = products.body.find((p) => p.code === 'COIN_10');
  assert(coin10, 'COIN_10 exists');
  assert(coin10.active, 'COIN_10 active');
  assert(coin10.price === 1000, 'COIN_10 price 1000');
  assert(coin10.coinAmount === '10', 'COIN_10 amount 10');
  console.log('OK COIN_10', { id: coin10.id, price: coin10.price, coinAmount: coin10.coinAmount });
  return coin10;
}

async function coinGuards(admin: Auth, devA: Auth, devB: Auth, productId: string) {
  const tamper = await j('/payments/orders', {
    method: 'POST',
    headers: devA,
    body: JSON.stringify({ productId, amount: 1, coinAmount: '999' }),
  });
  assert(tamper.status >= 400, `tamper rejected ${tamper.status}`);

  const order = await j<{ orderId: string; amount: number; checkoutUrl: string }>('/payments/orders', {
    method: 'POST',
    headers: devA,
    body: JSON.stringify({ productId }),
  });
  assert(order.status < 300, `order ${order.status}`);
  assert(order.body.amount === 1000, 'server amount 1000');

  const ownership = await j('/payments/toss/confirm', {
    method: 'POST',
    headers: devB,
    body: JSON.stringify({
      paymentKey: 'pay_probe',
      orderId: order.body.orderId,
      amount: order.body.amount,
    }),
  });
  assert(ownership.status === 403, `ownership ${ownership.status}`);

  const amountTamper = await j('/payments/toss/confirm', {
    method: 'POST',
    headers: devA,
    body: JSON.stringify({
      paymentKey: 'pay_probe',
      orderId: order.body.orderId,
      amount: order.body.amount + 1,
    }),
  });
  assert(amountTamper.status === 400, `amount tamper ${amountTamper.status}`);

  console.log('OK coin guards', { orderId: order.body.orderId, checkoutUrl: order.body.checkoutUrl });
  return order.body;
}

async function joinPricingCases(admin: Auth, devA: Auth) {
  // CASE A: Base PAID 30, Owner FREE → owner preview fee 0
  await setJoinPricing(admin, {
    baseMode: 'PAID',
    baseFeeCoinAmount: 30,
    ownerOverride: 'FREE',
    ownerFixedFeeCoinAmount: 0,
    premiumOverride: 'INHERIT',
    premiumFixedFeeCoinAmount: 0,
  });
  let preview = await j<{
    general: { feeCoinAmount: number };
    owner: { feeCoinAmount: number };
    premium: { feeCoinAmount: number };
    ownerAndPremium: { feeCoinAmount: number };
  }>('/admin/join-coin-policy/preview', { headers: admin });
  assert(preview.status === 200, 'preview A');
  assert(preview.body.general.feeCoinAmount === 30, 'CASE A general 30');
  assert(preview.body.owner.feeCoinAmount === 0, 'CASE A owner FREE');

  // CASE B: Base PAID 30, Premium FIXED_FEE 10
  await setJoinPricing(admin, {
    baseMode: 'PAID',
    baseFeeCoinAmount: 30,
    ownerOverride: 'FREE',
    ownerFixedFeeCoinAmount: 0,
    premiumOverride: 'FIXED_FEE',
    premiumFixedFeeCoinAmount: 10,
  });
  preview = await j('/admin/join-coin-policy/preview', { headers: admin });
  assert(preview.body.premium.feeCoinAmount === 10, 'CASE B premium 10');

  const premiumUser = await meJoinPolicy(devA);
  // DEV_A without premium membership should still see base fee
  assert(Number(premiumUser.creationCoinCost) === 30, 'CASE B general user fee 30');

  // CASE C: Owner FIXED 10, Premium FREE → owner+premium best price 0
  await setJoinPricing(admin, {
    baseMode: 'PAID',
    baseFeeCoinAmount: 30,
    ownerOverride: 'FIXED_FEE',
    ownerFixedFeeCoinAmount: 10,
    premiumOverride: 'FREE',
    premiumFixedFeeCoinAmount: 0,
  });
  preview = await j('/admin/join-coin-policy/preview', { headers: admin });
  assert(preview.body.ownerAndPremium.feeCoinAmount === 0, 'CASE C owner+premium 0');

  // CASE D: insufficient balance — join create must fail with zero wallet delta
  await setJoinPricing(admin, {
    baseMode: 'PAID',
    baseFeeCoinAmount: 30,
    ownerOverride: 'INHERIT',
    ownerFixedFeeCoinAmount: 0,
    premiumOverride: 'INHERIT',
    premiumFixedFeeCoinAmount: 0,
  });
  const walletBefore = await walletBalance(devA);
  const coinPreview = await j<{ canCreate: boolean; totalRequiredCoin: string }>('/joins/coin-preview', {
    method: 'POST',
    headers: devA,
    body: JSON.stringify({ plannedPlayerCount: 4 }),
  });
  assert(coinPreview.status < 300, `coin preview ${coinPreview.status} ${coinPreview.raw.slice(0, 120)}`);
  if (!coinPreview.body.canCreate) {
    const fail = await j('/joins', {
      method: 'POST',
      headers: devA,
      body: JSON.stringify({
        sportCode: 'SCREEN_GOLF',
        venue: {
          provider: 'MOCK',
          providerPlaceId: 'venue_sg_geoje',
          name: 'SG골프 거제점',
          address: '거제시',
          regionLabel: '거제시',
          latitude: 34.88,
          longitude: 128.62,
        },
        startAt: new Date(Date.now() + 4 * 60 * 60_000).toISOString(),
        plannedPlayerCount: 4,
        joinMethod: 'APPROVAL',
        title: 'billing e2e insufficient',
        idempotencyKey: `billing-insufficient-${Date.now()}`,
      }),
    });
    assert(fail.status >= 400, 'CASE D create rejected');
    const walletAfter = await walletBalance(devA);
    assert(walletAfter === walletBefore, 'CASE D wallet unchanged');
    console.log('OK join pricing CASE D insufficient balance blocked');
  } else {
    console.log('SKIP join pricing CASE D in preflight (run --case-d with DEV_C)');
  }

  const readback = await j<PricingPolicy>('/admin/join-coin-policy', { headers: admin });
  assert(readback.body.baseFeeCoinAmount === 30, 'readback base 30');

  console.log('OK join pricing API', {
    caseAOwnerFee: 0,
    caseBPremiumFee: 10,
    caseCOwnerPremiumFee: 0,
    generalFee: premiumUser.creationCoinCost,
  });
}

async function premiumPlansPreflight(devA: Auth) {
  const plans = await j<{
    monthlyEnabled: boolean;
    monthlyPriceKrw: number;
    yearlyEnabled: boolean;
    yearlyPriceKrw: number;
  }>('/premium/plans');
  assert(plans.status === 200, 'premium plans');
  assert(plans.body.monthlyEnabled, 'monthly enabled');
  assert(plans.body.yearlyEnabled, 'yearly enabled');

  const init = await j<{
    customerKey: string;
    billingAuthUrl: string;
    plan: string;
    amount: number;
  }>('/premium/subscribe/init', {
    method: 'POST',
    headers: devA,
    body: JSON.stringify({ plan: 'PREMIUM_MONTHLY' }),
  });
  assert(init.status < 300, `premium init ${init.status}`);
  assert(init.body.customerKey, 'customerKey');
  assert(init.body.billingAuthUrl.includes('billing-auth-page'), 'billing auth url');
  assert(!init.body.billingAuthUrl.includes('secret'), 'no secret in url');
  console.log('OK premium monthly preflight', {
    plan: init.body.plan,
    amount: init.body.amount,
    billingAuthUrl: init.body.billingAuthUrl,
  });
}

async function coinConfirmE2E(devA: Auth, productId: string) {
  const paymentKey = process.env.PAYMENT_KEY;
  const orderId = process.env.ORDER_ID;
  const amount = Number(process.env.AMOUNT ?? '1000');
  assert(paymentKey && orderId, 'Set PAYMENT_KEY and ORDER_ID for --coin-confirm');

  const before = await walletBalance(devA);
  const first = await j<{ payment: { status: string }; coinCredited?: string }>('/payments/toss/confirm', {
    method: 'POST',
    headers: devA,
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });
  assert(first.status < 300, `confirm ${first.status} ${first.raw.slice(0, 200)}`);
  assert(first.body.payment.status === 'PAID', 'PAID');
  assert(first.body.coinCredited === '10', `credited ${first.body.coinCredited}`);

  const after = await walletBalance(devA);
  assert(after === before + 10, `wallet +10 (${before} -> ${after})`);

  const dup = await j('/payments/toss/confirm', {
    method: 'POST',
    headers: devA,
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });
  assert(dup.status < 300, 'dup confirm');
  const afterDup = await walletBalance(devA);
  assert(afterDup === after, 'no duplicate credit');
  console.log('OK coin confirm E2E', { before, after, afterDup });
}

function joinCreateBody(idempotencyKey: string, startOffsetHours: number) {
  return {
    sportCode: SCREEN_GOLF_CODE,
    venue: {
      provider: 'MOCK',
      providerPlaceId: 'venue_sg_geoje',
      name: 'SG골프 거제점',
      address: '거제시',
      regionLabel: '거제시',
      latitude: 34.88,
      longitude: 128.62,
    },
    startAt: new Date(Date.now() + startOffsetHours * 60 * 60_000).toISOString(),
    plannedPlayerCount: 4,
    joinMethod: JoinMethod.APPROVAL,
    title: '[QA-BILLING] join pricing',
    idempotencyKey,
  };
}

async function joinPricingCaseD(admin: Auth, lowBalance: Auth) {
  await setJoinPricing(admin, {
    baseMode: 'PAID',
    baseFeeCoinAmount: 30,
    ownerOverride: 'INHERIT',
    ownerFixedFeeCoinAmount: 0,
    premiumOverride: 'INHERIT',
    premiumFixedFeeCoinAmount: 0,
  });

  const balance = await walletBalance(lowBalance);
  assert(balance < 30, `CASE D fixture balance ${balance} must be < 30`);

  const walletBefore = balance;
  const txsBefore = await j<{ items: unknown[] }>('/me/wallet/transactions?limit=5', {
    headers: lowBalance,
  });
  const fail = await j('/joins', {
    method: 'POST',
    headers: lowBalance,
    body: JSON.stringify(joinCreateBody(`billing-case-d-fail-${Date.now()}`, 20)),
  });
  assert(fail.status >= 400, `CASE D rejected ${fail.status}`);
  assert(fail.raw.includes('INSUFFICIENT_BALANCE'), 'INSUFFICIENT_BALANCE');
  assert(await walletBalance(lowBalance) === walletBefore, 'CASE D wallet unchanged');
  const txsAfter = await j<{ items: unknown[] }>('/me/wallet/transactions?limit=5', {
    headers: lowBalance,
  });
  assert(txsAfter.body.items.length === txsBefore.body.items.length, 'CASE D ledger unchanged');
  console.log('BILLING_JOIN_PRICING_CASE_D_PASS', { walletBefore });
}

const ACTIVE_HOST_STATUSES = new Set(['OPEN', 'FULL', 'CONFIRMED', 'IN_PROGRESS']);

async function cleanupBlockingHostedJoin(host: Auth) {
  const mine = await j<{ hosted: Array<{ joinId: string; status: string }> }>('/joins/mine', {
    headers: host,
  });
  assert(mine.status < 300, `joins/mine ${mine.status}`);
  const blocking = mine.body.hosted?.find((row) => ACTIVE_HOST_STATUSES.has(row.status));
  if (!blocking) return;

  const detail = await j<{
    participants: Array<{ participantId: string; role: string; participationStatus: string }>;
  }>(`/joins/${blocking.joinId}`, { headers: host });
  assert(detail.status < 300, `join detail ${detail.status}`);

  const applied = detail.body.participants.find(
    (p) => p.role !== 'HOST' && p.participationStatus === 'APPLIED',
  );
  if (applied) {
    await j(`/joins/${blocking.joinId}/participants/${applied.participantId}/approve`, {
      method: 'POST',
      headers: host,
    });
  }

  const refreshed = applied
    ? await j<{
        participants: Array<{ participantId: string; role: string; participationStatus: string }>;
      }>(`/joins/${blocking.joinId}`, { headers: host })
    : detail;
  const nonHost = refreshed.body.participants.filter(
    (p) => p.role !== 'HOST' && p.participationStatus !== 'APPLIED',
  );

  await j(`/joins/${blocking.joinId}/settlements/_qa/advance-clock`, {
    method: 'POST',
    headers: host,
    body: JSON.stringify({ mode: 'open' }),
  });

  if (nonHost.length > 0) {
    await j(`/joins/${blocking.joinId}/settlements/finalize`, {
      method: 'POST',
      headers: host,
      body: JSON.stringify({
        attendance: nonHost.map((p) => ({ participantId: p.participantId, attended: false })),
      }),
    });
  }
}

async function joinCreationRetry(devA: Auth) {
  await cleanupBlockingHostedJoin(devA);
  const idem = `billing-join-retry-${Date.now()}`;
  const body = joinCreateBody(idem, 8);
  const preview = await j<{ roomCreationFee: string; rewardHoldTotal: string; canCreate: boolean }>(
    '/joins/coin-preview',
    { method: 'POST', headers: devA, body: JSON.stringify({ plannedPlayerCount: 4 }) },
  );
  assert(preview.status < 300, `preview ${preview.status}`);
  assert(preview.body.canCreate, 'preview canCreate');

  const created = await j<{ joinId: string; roomCreationFeeAmount: string; rewardHoldTotalAmount: string }>(
    '/joins',
    { method: 'POST', headers: devA, body: JSON.stringify(body) },
  );
  assert(created.status < 300, `create ${created.status}`);
  const walletAfterCreate = await walletBalance(devA);
  const dup = await j<{ joinId: string }>('/joins', { method: 'POST', headers: devA, body: JSON.stringify(body) });
  assert(dup.status < 300 && dup.body.joinId === created.body.joinId, 'idempotent join');

  assert(await walletBalance(devA) === walletAfterCreate, 'wallet unchanged on dup');
  const txs = await j<{ items: Array<{ type: string; reference: { refId: string | null } }> }>(
    '/me/wallet/transactions?limit=30',
    { headers: devA },
  );
  assert(
    txs.body.items.filter((t) => t.type === 'ROOM_CREATION_FEE' && t.reference.refId === created.body.joinId).length === 1,
    'ROOM_CREATION_FEE x1',
  );
  assert(
    txs.body.items.filter((t) => t.type === 'JOIN_REWARD_HOLD' && t.reference.refId === created.body.joinId).length === 1,
    'JOIN_REWARD_HOLD x1',
  );
  console.log('BILLING_JOIN_RETRY_PASS', {
    joinId: created.body.joinId,
    fee: created.body.roomCreationFeeAmount,
    hold: created.body.rewardHoldTotalAmount,
  });
}

async function renewalCron() {
  const secret = process.env.SETTLEMENT_CRON_SECRET;
  assert(secret, 'SETTLEMENT_CRON_SECRET');
  const res = await fetch(`${API}/premium/renewals/process`, {
    method: 'POST',
    headers: { 'x-settlement-cron-secret': secret, Authorization: `Bearer ${secret}` },
  });
  const text = await res.text();
  assert(res.status < 300, `renewal ${res.status} ${text}`);
  console.log('BILLING_RENEWAL_CRON_PASS', { status: res.status, body: text.slice(0, 120) });
}

async function verifyLiveMissing(admin: Auth) {
  const s = await j<{ environment: string; enabled: boolean; hasSecretKey: boolean }>(
    '/admin/payment-settings',
    { headers: admin },
  );
  assert(s.status === 200 && s.body.environment === 'TEST', 'DEV TEST only');
  console.log('BILLING_LIVE_MISSING_SAFE_PASS', { liveNotActive: s.body.environment !== 'LIVE' });
}

async function policyMatrix(admin: Auth) {
  const cases: Array<{ label: string; policy: PricingPolicy; owner: number; premium: number; both: number }> = [
    {
      label: 'Base30 OwnerFREE',
      policy: {
        baseMode: 'PAID',
        baseFeeCoinAmount: 30,
        ownerOverride: 'FREE',
        ownerFixedFeeCoinAmount: 0,
        premiumOverride: 'INHERIT',
        premiumFixedFeeCoinAmount: 0,
      },
      owner: 0,
      premium: 30,
      both: 0,
    },
    {
      label: 'Base30 OwnerFIXED10',
      policy: {
        baseMode: 'PAID',
        baseFeeCoinAmount: 30,
        ownerOverride: 'FIXED_FEE',
        ownerFixedFeeCoinAmount: 10,
        premiumOverride: 'INHERIT',
        premiumFixedFeeCoinAmount: 0,
      },
      owner: 10,
      premium: 30,
      both: 10,
    },
    {
      label: 'Base30 PremiumFREE',
      policy: {
        baseMode: 'PAID',
        baseFeeCoinAmount: 30,
        ownerOverride: 'INHERIT',
        ownerFixedFeeCoinAmount: 0,
        premiumOverride: 'FREE',
        premiumFixedFeeCoinAmount: 0,
      },
      owner: 30,
      premium: 0,
      both: 0,
    },
    {
      label: 'Base30 PremiumFIXED10',
      policy: {
        baseMode: 'PAID',
        baseFeeCoinAmount: 30,
        ownerOverride: 'INHERIT',
        ownerFixedFeeCoinAmount: 0,
        premiumOverride: 'FIXED_FEE',
        premiumFixedFeeCoinAmount: 10,
      },
      owner: 30,
      premium: 10,
      both: 10,
    },
    {
      label: 'Owner10 PremiumFREE',
      policy: {
        baseMode: 'PAID',
        baseFeeCoinAmount: 30,
        ownerOverride: 'FIXED_FEE',
        ownerFixedFeeCoinAmount: 10,
        premiumOverride: 'FREE',
        premiumFixedFeeCoinAmount: 0,
      },
      owner: 10,
      premium: 0,
      both: 0,
    },
    {
      label: 'Owner20 Premium10',
      policy: {
        baseMode: 'PAID',
        baseFeeCoinAmount: 30,
        ownerOverride: 'FIXED_FEE',
        ownerFixedFeeCoinAmount: 20,
        premiumOverride: 'FIXED_FEE',
        premiumFixedFeeCoinAmount: 10,
      },
      owner: 20,
      premium: 10,
      both: 10,
    },
  ];

  for (const c of cases) {
    await setJoinPricing(admin, c.policy);
    const preview = await j<{
      general: { feeCoinAmount: number };
      owner: { feeCoinAmount: number };
      premium: { feeCoinAmount: number };
      ownerAndPremium: { feeCoinAmount: number };
    }>('/admin/join-coin-policy/preview', { headers: admin });
    assert(preview.status === 200, `preview ${c.label}`);
    assert(preview.body.general.feeCoinAmount === 30, `${c.label} general`);
    assert(preview.body.owner.feeCoinAmount === c.owner, `${c.label} owner`);
    assert(preview.body.premium.feeCoinAmount === c.premium, `${c.label} premium`);
    assert(preview.body.ownerAndPremium.feeCoinAmount === c.both, `${c.label} both`);
  }
  console.log('BILLING_POLICY_MATRIX_PASS', { cases: cases.length });
}

async function permissionSeparation(admin: Auth, hostLimited: Auth) {
  await cleanupBlockingHostedJoin(hostLimited);

  await setJoinPricing(admin, {
    baseMode: 'PAID',
    baseFeeCoinAmount: 30,
    ownerOverride: 'INHERIT',
    ownerFixedFeeCoinAmount: 0,
    premiumOverride: 'FREE',
    premiumFixedFeeCoinAmount: 0,
  });

  const policy = await meJoinPolicy(hostLimited);
  assert(Number(policy.creationCoinCost) === 30, 'non-premium user keeps base fee');

  const blocking = await j<{ joinId: string }>('/joins', {
    method: 'POST',
    headers: hostLimited,
    body: JSON.stringify(joinCreateBody(`billing-perm-seed-${Date.now()}`, 24)),
  });
  assert(blocking.status < 300, `seed join ${blocking.status}`);

  const fail = await j('/joins', {
    method: 'POST',
    headers: hostLimited,
    body: JSON.stringify(joinCreateBody(`billing-perm-sep-${Date.now()}`, 12)),
  });
  assert(fail.status === 403, `permission separation ${fail.status}`);
  assert(fail.raw.includes('JOIN_HOST_LIMIT'), 'JOIN_HOST_LIMIT despite premium FREE policy');
  console.log('BILLING_PERMISSION_SEPARATION_PASS');
}

async function premiumCancelFlow(user: Auth, userId: string) {
  const expiresAt = new Date(Date.now() + 20 * 24 * 60 * 60_000);
  await withBillingPrisma(async (prisma) => {
    await clearPremiumMembership(prisma, userId);
    await seedPremiumMembership(prisma, userId, {
      plan: 'PREMIUM_MONTHLY',
      expiresAt,
      nextBillingAt: expiresAt,
    });
  });

  const before = await j<{
    active: boolean;
    cancelAtPeriodEnd: boolean;
    expiresAt: string;
  }>('/me/premium', { headers: user });
  assert(before.body.active, 'premium active before cancel');
  assert(!before.body.cancelAtPeriodEnd, 'not cancelled yet');

  const cancelled = await j<{
    active: boolean;
    cancelAtPeriodEnd: boolean;
    expiresAt: string;
  }>('/premium/cancel', { method: 'POST', headers: user });
  assert(cancelled.status < 300, `cancel ${cancelled.status}`);
  assert(cancelled.body.cancelAtPeriodEnd, 'cancelAtPeriodEnd true');
  assert(cancelled.body.active, 'still active until period end');
  assert(cancelled.raw.includes('billingKey') === false, 'no billing key in response');

  const unreadBefore = await j<{ count: number }>('/me/notifications/unread-count', { headers: user });
  const notes = await j<{ items: Array<{ type: string }> }>('/me/notifications?limit=20', {
    headers: user,
  });
  const cancelNote = notes.body.items.find((n) => n.type === 'PREMIUM_CANCEL_SCHEDULED');
  assert(cancelNote, 'PREMIUM_CANCEL_SCHEDULED notification');
  assert(unreadBefore.status === 200, 'unread count');

  await withBillingPrisma(async (prisma) => {
    await clearPremiumMembership(prisma, userId);
  });
  console.log('BILLING_PREMIUM_CANCEL_PASS');
}

async function verifyCoinCatalog() {
  const products = await j<Array<{ code: string; price: number; coinAmount: string | null; active: boolean }>>(
    '/payment-products?type=COIN_CHARGE',
  );
  assert(products.status === 200, 'coin products');
  const expected = [
    ['COIN_10', 1000, '10'],
    ['COIN_30', 3000, '30'],
    ['COIN_50', 5000, '50'],
    ['COIN_100', 10000, '100'],
  ] as const;
  for (const [code, price, coin] of expected) {
    const row = products.body.find((p) => p.code === code && p.active);
    assert(row, `${code} active`);
    assert(row.price === price, `${code} price`);
    assert(row.coinAmount === coin, `${code} coin`);
  }
  console.log('BILLING_COIN_CATALOG_PASS');
}

async function main() {
  const mode = process.argv.find((a) => a.startsWith('--')) ?? '--preflight';
  console.log('API=', API, 'mode=', mode);

  const admin = await adminAuth();
  const devA = await signIn(MockAuthPersona.DEV_A);
  const devB = await signIn(MockAuthPersona.DEV_B);

  await verifyPaymentConfig(admin);
  const coin10 = await verifyCoinProducts();

  if (mode === '--coin-confirm') {
    await coinConfirmE2E(devA.auth, coin10.id);
    console.log('BILLING_PREMIUM_DEV_E2E_COIN_CONFIRM_PASS');
    return;
  }
  if (mode === '--case-d') {
    const low = await signIn(MockAuthPersona.DEV_BILLING_LOW);
    await joinPricingCaseD(admin, low.auth);
    return;
  }
  if (mode === '--join-retry') {
    const retry = await signIn(MockAuthPersona.DEV_BILLING_RETRY);
    await joinCreationRetry(retry.auth);
    return;
  }
  if (mode === '--renewal-cron') {
    await renewalCron();
    return;
  }
  if (mode === '--live-missing') {
    await verifyLiveMissing(admin);
    return;
  }
  if (mode === '--policy-matrix') {
    await policyMatrix(admin);
    return;
  }
  if (mode === '--permission-separation') {
    const retry = await signIn(MockAuthPersona.DEV_BILLING_RETRY);
    await permissionSeparation(admin, retry.auth);
    return;
  }
  if (mode === '--premium-cancel') {
    const retry = await signIn(MockAuthPersona.DEV_BILLING_RETRY);
    await premiumCancelFlow(retry.auth, retry.userId);
    return;
  }
  if (mode === '--coin-catalog') {
    await verifyCoinCatalog();
    return;
  }

  await coinGuards(admin, devA.auth, devB.auth, coin10.id);
  await joinPricingCases(admin, devA.auth);
  await premiumPlansPreflight(devA.auth);
  await verifyCoinCatalog();

  const order = await j<{ orderId: string; checkoutUrl: string }>('/payments/orders', {
    method: 'POST',
    headers: devA.auth,
    body: JSON.stringify({ productId: coin10.id }),
  });
  assert(order.status < 300, 'coin order');

  console.log('OK coin order ready', {
    orderId: order.body.orderId,
    devClientCheckout: order.body.checkoutUrl,
  });
  console.log('BILLING_PREMIUM_DEV_E2E_PREFLIGHT_PASS');
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
