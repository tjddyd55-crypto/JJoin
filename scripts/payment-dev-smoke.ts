/**
 * Development payment foundation smoke — no real Toss confirm.
 * Target: https://api-development-e387.up.railway.app
 */
import { MockAuthPersona, SocialProvider } from '../packages/types/src/index.ts';

const API = process.env.API_BASE ?? 'https://api-development-e387.up.railway.app';

async function j<T>(path: string, init?: RequestInit): Promise<{ status: number; body: T }> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  let body: T;
  try {
    body = JSON.parse(text) as T;
  } catch {
    throw new Error(`${path} non-json ${res.status}: ${text.slice(0, 300)}`);
  }
  return { status: res.status, body };
}

async function signIn(persona: MockAuthPersona) {
  const sign = await j<{ session: { accessToken: string } }>('/auth/social/mock-sign-in', {
    method: 'POST',
    body: JSON.stringify({ provider: SocialProvider.KAKAO, persona }),
  });
  if (sign.status >= 300) throw new Error(`sign-in ${persona} ${sign.status}`);
  return { Authorization: `Bearer ${sign.body.session.accessToken}` };
}

async function main() {
  console.log('API=', API);
  const health = await j<{ status: string; database?: string }>('/health');
  console.log('health', health.status, health.body);
  if (health.status !== 200) throw new Error('health failed');

  const products = await j<Array<{ id: string; code: string; price: number; coinAmount?: string | null; premiumDays?: number | null }>>(
    '/payment-products',
  );
  console.log('payment-products', products.status, products.body?.map((p) => p.code));
  if (products.status !== 200) throw new Error('payment-products failed');

  const items = products.body;
  const codes = new Set(items.map((p) => p.code));
  for (const code of ['COIN_10000', 'COIN_30000', 'COIN_50000', 'PREMIUM_30D']) {
    if (!codes.has(code)) throw new Error(`missing product ${code}`);
  }

  const coin = items.find((p) => p.code === 'COIN_10000');
  if (!coin || coin.price !== 10000 || coin.coinAmount !== '10000') {
    throw new Error('COIN_10000 price/coin mismatch');
  }

  const premium = items.find((p) => p.code === 'PREMIUM_30D');
  if (!premium || premium.price !== 9900 || premium.premiumDays !== 30) {
    throw new Error('PREMIUM_30D price/days mismatch');
  }

  const auth = await signIn(MockAuthPersona.DEV_A);
  const walletBefore = await j<{ balance: string }>('/wallet', { headers: auth });
  console.log('wallet before', walletBefore.body.balance);

  const order = await j<{ paymentId: string; orderId: string; amount: number }>('/payments/orders', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ productId: items.find((p) => p.code === 'COIN_10000')!.id }),
  });
  console.log('order', order.status, order.body.orderId, order.body.amount);
  if (order.status === 503) {
    console.warn('ORDER_SKIPPED payment_not_configured — configure Toss TEST keys in Admin');
    return;
  }
  if (order.status !== 201 && order.status !== 200) throw new Error(`order failed ${order.status}`);

  const walletAfter = await j<{ balance: string }>('/wallet', { headers: auth });
  if (walletAfter.body.balance !== walletBefore.body.balance) {
    throw new Error('wallet changed before confirm');
  }

  const tamper = await j('/payments/orders', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      productId: items.find((p) => p.code === 'COIN_10000')!.id,
      amount: 1,
    }),
  });
  if (tamper.status < 400) throw new Error('tamper amount should be rejected');

  console.log('PASS payment-dev-smoke');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
