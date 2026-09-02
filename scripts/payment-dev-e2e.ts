/**
 * Development Toss TEST payment E2E (API layer).
 * Requires Toss TEST keys configured in Development Admin.
 * Does not log secrets. Browser checkout supplies paymentKey via env.
 *
 * Usage:
 *   pnpm exec tsx scripts/payment-dev-e2e.ts
 *   PAYMENT_KEY=... ORDER_ID=... AMOUNT=10000 pnpm exec tsx scripts/payment-dev-e2e.ts --confirm-coin
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

async function adminAuth(): Promise<Auth> {
  const loginId = process.env.JJOIN_ADMIN_LOGIN_ID;
  const password = process.env.JJOIN_ADMIN_LOGIN_PASSWORD;
  if (!loginId || !password) {
    throw new Error('Set JJOIN_ADMIN_LOGIN_ID and JJOIN_ADMIN_LOGIN_PASSWORD');
  }
  const sign = await j<{ session: { accessToken: string } }>('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ loginId, password }),
  });
  if (sign.status >= 300) throw new Error(`admin login ${sign.status}`);
  return { Authorization: `Bearer ${sign.body.session.accessToken}` };
}

async function signIn(persona: MockAuthPersona): Promise<Auth> {
  const sign = await j<{ session: { accessToken: string } }>('/auth/social/mock-sign-in', {
    method: 'POST',
    body: JSON.stringify({ provider: SocialProvider.KAKAO, persona }),
  });
  if (sign.status >= 300) throw new Error(`sign-in ${persona} ${sign.status}`);
  return { Authorization: `Bearer ${sign.body.session.accessToken}` };
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function verifySettings(admin: Auth) {
  const s = await j<{
    provider: string;
    environment: string;
    enabled: boolean;
    clientKey: string | null;
    hasSecretKey: boolean;
    secretKeyMasked: string | null;
    statusLabel: string;
  }>('/admin/payment-settings', { headers: admin });
  assert(s.status === 200, `admin settings ${s.status}`);
  assert(s.body.provider === 'TOSS', 'provider');
  assert(s.body.environment === 'TEST', 'environment');
  assert(s.body.enabled === true, 'enabled');
  assert(Boolean(s.body.clientKey), 'clientKey configured');
  assert(s.body.hasSecretKey === true, 'hasSecretKey');
  assert(Boolean(s.body.secretKeyMasked), 'secretKeyMasked');
  // Full secret must never appear; masked prefix (first 8) is expected by maskSecretKey().
  const masked = s.body.secretKeyMasked ?? '';
  assert(masked.includes('*'), 'masked contains asterisks');
  assert(masked.length < 40, 'masked length bounded');
  console.log('OK admin settings', {
    provider: s.body.provider,
    environment: s.body.environment,
    enabled: s.body.enabled,
    clientConfigured: Boolean(s.body.clientKey),
    secretMasked: Boolean(s.body.secretKeyMasked),
    statusLabel: s.body.statusLabel,
  });
}

async function verifyPublicConfig() {
  const p = await j<{ enabled: boolean; environment: string; clientKey: string; provider: string }>(
    '/payment-config/public',
  );
  assert(p.status === 200, `public config ${p.status}`);
  assert(p.body.enabled === true, 'public enabled');
  assert(p.body.environment === 'TEST', 'public env');
  assert(Boolean(p.body.clientKey), 'public clientKey');
  assert(!('secretKey' in (p.body as object)), 'public must not include secretKey');
  console.log('OK public config', {
    enabled: p.body.enabled,
    environment: p.body.environment,
    clientKeyPrefix: p.body.clientKey.slice(0, 12) + '…',
  });
}

async function loadProducts() {
  const products = await j<
    Array<{ id: string; code: string; price: number; coinAmount?: string | null; premiumDays?: number | null }>
  >('/payment-products');
  assert(products.status === 200, `products ${products.status}`);
  const byCode = Object.fromEntries(products.body.map((p) => [p.code, p]));
  for (const code of ['COIN_10000', 'COIN_30000', 'COIN_50000', 'PREMIUM_30D']) {
    assert(byCode[code], `missing ${code}`);
  }
  assert(byCode.COIN_10000!.price === 10000 && byCode.COIN_10000!.coinAmount === '10000', 'COIN_10000');
  assert(byCode.COIN_30000!.price === 30000 && byCode.COIN_30000!.coinAmount === '30000', 'COIN_30000');
  assert(byCode.COIN_50000!.price === 50000 && byCode.COIN_50000!.coinAmount === '50000', 'COIN_50000');
  assert(byCode.PREMIUM_30D!.price === 9900 && byCode.PREMIUM_30D!.premiumDays === 30, 'PREMIUM_30D');
  console.log('OK products', products.body.map((p) => p.code));
  return { items: products.body, byCode };
}

async function createOrder(auth: Auth, productId: string) {
  const order = await j<{
    paymentId: string;
    orderId: string;
    amount: number;
    checkoutUrl: string;
    orderName: string;
    clientKey: string;
  }>('/payments/orders', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ productId }),
  });
  assert(order.status === 200 || order.status === 201, `order ${order.status} ${order.raw.slice(0, 120)}`);
  return order.body;
}

async function walletBalance(auth: Auth) {
  const w = await j<{ availableBalance: string }>('/me/wallet', { headers: auth });
  assert(w.status === 200, `wallet ${w.status}`);
  return w.body.availableBalance;
}

async function confirm(auth: Auth, input: { paymentKey: string; orderId: string; amount: number }) {
  return j<{
    payment: { id: string; status: string; amount: number };
    coinCredited?: string;
    premiumStatus?: { expiresAt: string; startedAt: string };
  }>('/payments/toss/confirm', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify(input),
  });
}

async function premiumStatus(auth: Auth) {
  const p = await j<{ active: boolean; expiresAt: string | null }>('/me/premium', { headers: auth });
  assert(p.status === 200, `premium ${p.status}`);
  return p.body;
}

async function adminPayments(admin: Auth) {
  const p = await j<{ items: Array<{ id: string; status: string; productName: string; amount: number }> }>(
    '/admin/payments',
    { headers: admin },
  );
  assert(p.status === 200, `admin payments ${p.status}`);
  return p.body.items;
}

async function main() {
  const mode = process.argv.find((a) => a.startsWith('--')) ?? '--preflight';
  console.log('API=', API, 'mode=', mode);

  const admin = await adminAuth();
  await verifySettings(admin);
  await verifyPublicConfig();
  const { byCode } = await loadProducts();

  const devA = await signIn(MockAuthPersona.DEV_A);
  const devB = await signIn(MockAuthPersona.DEV_B);

  if (mode === '--preflight') {
    const balanceBefore = await walletBalance(devA);
    const guardOrder = await createOrder(devA, byCode.COIN_10000!.id);

    const tamperOrder = await j('/payments/orders', {
      method: 'POST',
      headers: devA,
      body: JSON.stringify({
        productId: byCode.COIN_10000!.id,
        amount: 1,
      }),
    });
    assert(tamperOrder.status >= 400, `order tamper field rejected ${tamperOrder.status}`);

    const ownership = await confirm(devB, {
      paymentKey: 'pay_test_ownership_probe',
      orderId: guardOrder.orderId,
      amount: guardOrder.amount,
    });
    assert(ownership.status === 403, `ownership ${ownership.status}`);

    const amountTamper = await confirm(devA, {
      paymentKey: 'pay_test_amount_probe',
      orderId: guardOrder.orderId,
      amount: guardOrder.amount + 1,
    });
    assert(amountTamper.status === 400, `confirm amount tamper ${amountTamper.status}`);
    const balanceAfterTamper = await walletBalance(devA);
    assert(balanceAfterTamper === balanceBefore, 'tamper confirm no credit');

    const order = await createOrder(devA, byCode.COIN_10000!.id);
    const balanceAfterOrder = await walletBalance(devA);
    assert(balanceAfterOrder === balanceBefore, 'balance unchanged before confirm');

    console.log('OK coin order', {
      paymentId: order.paymentId,
      orderId: order.orderId,
      amount: order.amount,
      checkoutUrl: order.checkoutUrl,
    });
    console.log('OK guards', { orderTamper: tamperOrder.status, ownership: ownership.status, amountTamper: amountTamper.status });
    console.log(
      'NEXT: open checkoutUrl in desktop browser, complete Toss TEST once (web callback auto-confirms).',
    );
    console.log('THEN: ORDER_ID=' + order.orderId + ' pnpm exec tsx scripts/payment-dev-e2e.ts --verify-coin');
    return;
  }

  if (mode === '--verify-coin') {
    const orderId = process.env.ORDER_ID;
    assert(orderId, 'Set ORDER_ID from preflight output');

    const before = Number(process.env.BALANCE_BEFORE ?? await walletBalance(devA));
    const adminRows = await j<{
      items: Array<{ id: string; status: string; amount: number; orderId: string; productName: string }>;
    }>('/admin/payments', { headers: admin });
    assert(adminRows.status === 200, `admin payments ${adminRows.status}`);
    const row = adminRows.body.items.find((p) => p.orderId === orderId);
    assert(row, 'payment row for orderId');
    assert(row.status === 'PAID', 'PAID');
    assert(row.amount === 10000, 'amount 10000');

    const detail = await j<{ status: string; amount: number; orderId: string }>(`/payments/${row.id}`, {
      headers: devA,
    });
    assert(detail.status === 200, `payment detail ${detail.status}`);
    assert(detail.body.status === 'PAID', 'user detail PAID');
    assert(detail.body.orderId === orderId, 'orderId match');

    const after = await walletBalance(devA);
    assert(Number(after) === before + 10000, `balance +10000 (${before} -> ${after})`);

    const dup = await confirm(devA, {
      paymentKey: 'pay_web_callback_dup_probe',
      orderId,
      amount: 10000,
    });
    assert(dup.status === 200 || dup.status === 201, `dup confirm ${dup.status}`);
    assert(dup.body.payment.status === 'PAID', 'dup PAID');
    const afterDup = await walletBalance(devA);
    assert(afterDup === after, 'no duplicate credit');

    const tamper = await confirm(devA, {
      paymentKey: 'pay_web_callback_dup_probe',
      orderId,
      amount: 10001,
    });
    assert(tamper.status === 400, `tamper status ${tamper.status}`);
    const afterTamper = await walletBalance(devA);
    assert(afterTamper === after, 'tamper no credit');

    const other = await confirm(devB, {
      paymentKey: 'pay_web_callback_dup_probe',
      orderId,
      amount: 10000,
    });
    assert(other.status === 403, `ownership ${other.status}`);

    const payments = await adminPayments(admin);
    assert(payments.some((p) => p.status === 'PAID' && p.amount === 10000), 'admin sees PAID coin');
    console.log('OK coin verify after web callback', { orderId, before, after, afterDup, paymentId: row.id });
    return;
  }

  if (mode === '--confirm-coin') {
    const paymentKey = process.env.PAYMENT_KEY;
    const orderId = process.env.ORDER_ID;
    const amount = Number(process.env.AMOUNT ?? '10000');
    assert(paymentKey && orderId, 'Set PAYMENT_KEY and ORDER_ID');

    const before = await walletBalance(devA);
    const first = await confirm(devA, { paymentKey, orderId, amount });
    assert(first.status === 200 || first.status === 201, `confirm ${first.status} ${first.raw.slice(0, 200)}`);
    assert(first.body.payment.status === 'PAID', 'PAID');
    assert(first.body.coinCredited === '10000', `coin credited ${first.body.coinCredited}`);
    const after = await walletBalance(devA);
    assert(Number(after) === Number(before) + 10000, `balance +10000 (${before} -> ${after})`);

    const dup = await confirm(devA, { paymentKey, orderId, amount });
    assert(dup.status === 200 || dup.status === 201, `dup confirm ${dup.status}`);
    assert(dup.body.payment.status === 'PAID', 'dup PAID');
    const afterDup = await walletBalance(devA);
    assert(afterDup === after, 'no duplicate credit');

    const tamper = await confirm(devA, { paymentKey, orderId, amount: amount + 1 });
    assert(tamper.status === 400, `tamper status ${tamper.status}`);
    const afterTamper = await walletBalance(devA);
    assert(afterTamper === after, 'tamper no credit');

    const other = await confirm(devB, { paymentKey, orderId, amount });
    assert(other.status === 403, `ownership ${other.status}`);

    const payments = await adminPayments(admin);
    assert(payments.some((p) => p.status === 'PAID'), 'admin sees PAID coin payment');
    console.log('OK coin confirm E2E', { before, after, afterDup, paymentId: first.body.payment.id });
    return;
  }

  if (mode === '--premium-preflight') {
    const statusBefore = await premiumStatus(devA);
    const order = await createOrder(devA, byCode.PREMIUM_30D!.id);
    console.log('OK premium order', { orderId: order.orderId, premiumBefore: statusBefore, checkoutUrl: order.checkoutUrl });
    console.log(
      'NEXT: open checkoutUrl in desktop browser, complete Toss TEST once (web callback auto-confirms).',
    );
    console.log('THEN: ORDER_ID=' + order.orderId + ' pnpm exec tsx scripts/payment-dev-e2e.ts --verify-premium');
    return;
  }

  if (mode === '--verify-premium') {
    const orderId = process.env.ORDER_ID;
    assert(orderId, 'Set ORDER_ID from premium-preflight output');

    const adminRows = await j<{
      items: Array<{ id: string; status: string; amount: number; orderId: string }>;
    }>('/admin/payments', { headers: admin });
    assert(adminRows.status === 200, `admin payments ${adminRows.status}`);
    const row = adminRows.body.items.find((p) => p.orderId === orderId);
    assert(row, 'premium payment row');
    assert(row.status === 'PAID', 'premium PAID');
    assert(row.amount === 9900, 'amount 9900');

    const payment = await j<{ status: string; amount: number; orderId: string }>(`/payments/${row.id}`, {
      headers: devA,
    });
    assert(payment.status === 200, `payment detail ${payment.status}`);
    assert(payment.body.status === 'PAID', 'user detail PAID');
    assert(payment.body.orderId === orderId, 'orderId match');

    const after = await premiumStatus(devA);
    assert(after.active === true, 'premium active');
    assert(after.expiresAt, 'expiresAt set');
    const expires1 = after.expiresAt!;

    const dup = await confirm(devA, {
      paymentKey: 'pay_web_callback_dup_probe',
      orderId,
      amount: 9900,
    });
    assert(dup.status === 200 || dup.status === 201, 'premium dup');
    const afterDup = await premiumStatus(devA);
    assert(afterDup.expiresAt === expires1, 'no duplicate extension');

    const payments = await adminPayments(admin);
    assert(payments.filter((p) => p.status === 'PAID' && p.amount === 9900).length >= 1, 'admin premium PAID');
    console.log('OK premium verify after web callback', { orderId, expiresAt: expires1 });
    return;
  }

  if (mode === '--confirm-premium') {
    const paymentKey = process.env.PAYMENT_KEY;
    const orderId = process.env.ORDER_ID;
    const amount = Number(process.env.AMOUNT ?? '9900');
    assert(paymentKey && orderId, 'Set PAYMENT_KEY and ORDER_ID');

    const before = await premiumStatus(devA);
    const first = await confirm(devA, { paymentKey, orderId, amount });
    assert(first.status === 200 || first.status === 201, `premium confirm ${first.status}`);
    assert(first.body.payment.status === 'PAID', 'premium PAID');
    assert(first.body.premiumStatus?.expiresAt, 'expiresAt set');
    const after = await premiumStatus(devA);
    assert(after.active === true, 'premium active');
    const expires1 = after.expiresAt!;

    const dup = await confirm(devA, { paymentKey, orderId, amount });
    assert(dup.status === 200 || dup.status === 201, 'premium dup');
    const afterDup = await premiumStatus(devA);
    assert(afterDup.expiresAt === expires1, 'no duplicate extension');

    const payments = await adminPayments(admin);
    assert(payments.filter((p) => p.status === 'PAID').length >= 2, 'admin payments include premium');
    console.log('OK premium confirm E2E', { before, after, expiresAt: expires1 });
    return;
  }

  throw new Error(`unknown mode ${mode}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
