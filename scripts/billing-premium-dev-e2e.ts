/**
 * Billing / Premium / Join Pricing DEV E2E — Railway development API.
 *
 * Usage:
 *   pnpm exec tsx scripts/billing-premium-dev-e2e.ts
 *   pnpm exec tsx scripts/billing-premium-dev-e2e.ts --coin-confirm
 *   ORDER_ID=... PAYMENT_KEY=... AMOUNT=1000 pnpm exec tsx scripts/billing-premium-dev-e2e.ts --coin-confirm
 */
import { MockAuthPersona, SocialProvider } from '../packages/types/src/index.ts';

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

async function signIn(persona: MockAuthPersona): Promise<Auth> {
  const sign = await j<{ session: { accessToken: string } }>('/auth/social/mock-sign-in', {
    method: 'POST',
    body: JSON.stringify({ provider: SocialProvider.KAKAO, persona }),
  });
  assert(sign.status < 300, `sign-in ${persona} ${sign.status}`);
  return { Authorization: `Bearer ${sign.body.session.accessToken}` };
}

async function walletBalance(auth: Auth): Promise<number> {
  const w = await j<{ availableBalance: string }>('/me/wallet', { headers: auth });
  assert(w.status === 200, `wallet ${w.status}`);
  return Number(w.body.availableBalance);
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
  await setJoinPricing(admin, {
    baseMode: 'PAID',
    baseFeeCoinAmount: 30,
    ownerOverride: 'FREE',
    ownerFixedFeeCoinAmount: 0,
    premiumOverride: 'FIXED_FEE',
    premiumFixedFeeCoinAmount: 10,
  });

  const readback = await j<PricingPolicy>('/admin/join-coin-policy', { headers: admin });
  assert(readback.body.baseFeeCoinAmount === 30, 'readback base 30');
  assert(readback.body.ownerOverride === 'FREE', 'readback owner FREE');

  const general = await meJoinPolicy(devA);
  assert(Number(general.creationCoinCost) === 30, 'general fee 30');

  console.log('OK join pricing API', {
    generalFee: general.creationCoinCost,
    effective: general.effectivePolicy?.effectiveFeeCoinAmount,
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

async function main() {
  const mode = process.argv.find((a) => a.startsWith('--')) ?? '--preflight';
  console.log('API=', API, 'mode=', mode);

  const admin = await adminAuth();
  const devA = await signIn(MockAuthPersona.DEV_A);
  const devB = await signIn(MockAuthPersona.DEV_B);

  await verifyPaymentConfig(admin);
  const coin10 = await verifyCoinProducts();

  if (mode === '--coin-confirm') {
    await coinConfirmE2E(devA, coin10.id);
    console.log('BILLING_PREMIUM_DEV_E2E_COIN_CONFIRM_PASS');
    return;
  }

  await coinGuards(admin, devA, devB, coin10.id);
  await joinPricingCases(admin, devA);
  await premiumPlansPreflight(devA);

  const order = await j<{ orderId: string; checkoutUrl: string }>('/payments/orders', {
    method: 'POST',
    headers: devA,
    body: JSON.stringify({ productId: coin10.id }),
  });
  assert(order.status < 300, 'coin order');

  console.log('OK coin order ready', {
    orderId: order.body.orderId,
    browserCheckout: `${order.body.checkoutUrl}&callback=web`,
  });
  console.log('NEXT coin: complete Toss TEST in browser, then:');
  console.log(`ORDER_ID=${order.body.orderId} PAYMENT_KEY=<from callback> AMOUNT=1000 pnpm exec tsx scripts/billing-premium-dev-e2e.ts --coin-confirm`);
  console.log('NEXT premium: open billingAuthUrl from preflight in browser for billing key flow');
  console.log('BILLING_PREMIUM_DEV_E2E_PREFLIGHT_PASS');
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
