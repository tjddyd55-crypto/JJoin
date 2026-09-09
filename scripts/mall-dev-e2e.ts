/**
 * Join Mall DEV API E2E — Railway development only.
 *
 *   $env:API_BASE='https://api-development-e387.up.railway.app'
 *   pnpm exec tsx scripts/mall-dev-e2e.ts
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  MallProductStatus,
  MockAuthPersona,
  SocialProvider,
} from '../packages/types/src/index.ts';

const API_BASE = (process.env.API_BASE ?? 'https://api-development-e387.up.railway.app').replace(/\/$/, '');
const TAG = '[mall-dev-e2e]';

type Auth = { Authorization: string; userId: string; token: string };

async function j<T>(path: string, init?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const raw = await res.text();
  let body = {} as T;
  try {
    body = JSON.parse(raw) as T;
  } catch {
    /* empty */
  }
  return { status: res.status, body, raw };
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`${TAG} ${msg}`);
}

async function signIn(persona: MockAuthPersona): Promise<Auth> {
  const { status, body } = await j<{ session: { accessToken: string; userId: string } }>(
    '/auth/social/mock-sign-in',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: SocialProvider.KAKAO, persona }),
    },
  );
  assert(status >= 200 && status < 300, `signIn ${persona} -> ${status}`);
  const token = body.session.accessToken;
  return { Authorization: `Bearer ${token}`, userId: body.session.userId, token };
}

async function mustOk<T>(path: string, init?: RequestInit): Promise<T> {
  const { status, body, raw } = await j<T>(path, init);
  assert(status >= 200 && status < 300, `${path} -> ${status} ${raw.slice(0, 500)}`);
  return body;
}

async function uploadAdminImage(path: string, token: string, filePath: string) {
  const form = new FormData();
  const bytes = readFileSync(filePath);
  form.append('file', new Blob([bytes], { type: 'image/png' }), 'sample.png');
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const raw = await res.text();
  assert(res.ok, `upload ${path} -> ${res.status} ${raw.slice(0, 300)}`);
  return JSON.parse(raw) as { coverImageUrl?: string | null; images?: Array<{ imageUrl: string }> };
}

async function main() {
  const health = await mustOk<{
    status: string;
    database: string;
    railwayEnvironment?: string;
    appVariant?: string;
  }>('/health');
  assert(health.database === 'connected', 'database not connected');
  assert(health.railwayEnvironment === 'development', `refusing non-development railway env: ${health.railwayEnvironment}`);
  assert(health.appVariant === 'development', `refusing non-development appVariant: ${health.appVariant}`);
  console.log(`${TAG} health ok railway=${health.railwayEnvironment} variant=${health.appVariant}`);

  const admin = await signIn(MockAuthPersona.DEV_ADMIN);
  const buyer = await signIn(MockAuthPersona.DEV_A);

  const categories = await mustOk<Array<{ id: string; name: string }>>('/admin/mall/categories', {
    headers: { Authorization: admin.Authorization },
  });
  assert(categories.length > 0, 'no mall categories');
  const categoryId = categories[0]!.id;

  const sampleImage = join(process.cwd(), 'apps', 'mobile', 'assets', 'images', 'icon.png');

  const ts = Date.now();
  const created = await mustOk<{ id: string; coverImageUrl: string | null }>('/admin/mall/products', {
    method: 'POST',
    headers: { Authorization: admin.Authorization, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `[QA] 골프 장갑 ${ts}`,
      categoryId,
      coinPrice: '500',
      stock: 5,
      status: MallProductStatus.ACTIVE,
      shortDescription: 'DEV QA sample glove',
      description: 'DEV mall QA product — generic golf glove sample.',
      exchangeGuide: '앱 내 구매내역에서 확인 후 수령 안내를 따릅니다.',
      badge: 'NEW',
    }),
  });

  const withCover = await uploadAdminImage(
    `/admin/mall/products/${created.id}/cover`,
    admin.token,
    sampleImage,
  );
  assert(Boolean(withCover.coverImageUrl), 'cover image url missing');
  const coverUrl = withCover.coverImageUrl!;
  console.log(`${TAG} coverUrl=${coverUrl}`);
  const coverGet = await fetch(coverUrl);
  assert(coverGet.ok, `cover public GET -> ${coverGet.status} url=${coverUrl}`);
  assert((coverGet.headers.get('content-type') ?? '').startsWith('image/'), 'cover content-type');

  await uploadAdminImage(`/admin/mall/products/${created.id}/images`, admin.token, sampleImage);

  const created2 = await mustOk<{ id: string }>('/admin/mall/products', {
    method: 'POST',
    headers: { Authorization: admin.Authorization, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `[QA] 골프공 세트 ${ts}`,
      categoryId,
      coinPrice: '800',
      stock: 3,
      status: MallProductStatus.ACTIVE,
      shortDescription: 'DEV QA sample ball set',
      description: 'DEV mall QA product — generic golf ball set sample.',
      exchangeGuide: '앱 내 구매내역에서 확인 후 수령 안내를 따릅니다.',
      badge: 'HOT',
    }),
  });
  await uploadAdminImage(`/admin/mall/products/${created2.id}/cover`, admin.token, sampleImage);
  await uploadAdminImage(`/admin/mall/products/${created2.id}/images`, admin.token, sampleImage);

  const list = await mustOk<{
    items: Array<{ id: string; name: string; purchaseState: string }>;
    availableCoin: string;
  }>('/mall/products', { headers: { Authorization: buyer.Authorization } });
  const found = list.items.find((item) => item.id === created.id);
  const found2 = list.items.find((item) => item.id === created2.id);
  assert(found, 'created product missing from mall list');
  assert(found2, 'second product missing from mall list');

  const detail = await mustOk<{
    id: string;
    purchaseState: string;
    coverImageUrl: string | null;
    images: Array<{ imageUrl: string }>;
    coinPrice: string;
    availableCoin: string;
  }>(`/mall/products/${created.id}`, { headers: { Authorization: buyer.Authorization } });
  assert(detail.coverImageUrl, 'detail cover missing');
  assert(detail.images.length >= 1, 'gallery missing');

  const poor = await signIn(MockAuthPersona.DEV_C);
  const poorDetail = await mustOk<{ purchaseState: string }>(`/mall/products/${created.id}`, {
    headers: { Authorization: poor.Authorization },
  });
  const poorPurchase = await j(`/mall/products/${created.id}/purchase`, {
    method: 'POST',
    headers: { Authorization: poor.Authorization },
  });
  assert(poorPurchase.status === 400, `expected insufficient_coin got ${poorPurchase.status}`);

  const purchase = await mustOk<{ orderId: string; remainingCoin: string }>(
    `/mall/products/${created.id}/purchase`,
    { method: 'POST', headers: { Authorization: buyer.Authorization } },
  );
  assert(purchase.orderId, 'orderId missing');

  const dup = await j(`/mall/products/${created.id}/purchase`, {
    method: 'POST',
    headers: { Authorization: buyer.Authorization },
  });
  assert(dup.status >= 400, `duplicate purchase should fail got ${dup.status}`);

  const orders = await mustOk<{ items: Array<{ id: string }> }>('/mall/orders', {
    headers: { Authorization: buyer.Authorization },
  });
  assert(orders.items.some((o) => o.id === purchase.orderId), 'order not in history');

  console.log(`${TAG} PASS product=${created.id} order=${purchase.orderId} cover=${coverUrl.slice(0, 80)}...`);
  console.log('MALL_DEV_API_E2E_PASS');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
