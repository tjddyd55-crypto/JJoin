/**
 * DEV-only mall demo products with realistic images and content blocks.
 *
 *   pnpm exec tsx scripts/download-mall-demo-assets.ts  # fetch missing assets
 *   pnpm exec tsx scripts/fetch-mall-demo-assets.ts     # verify assets exist
 *   pnpm exec tsx scripts/seed-mall-demo.ts
 */
import { readFileSync } from 'node:fs';
import {
  MallContentBlockType,
  MallProductStatus,
  MockAuthPersona,
  SocialProvider,
  type AdminMallProductDetailDto,
} from '../packages/types/src/index.ts';
import {
  MALL_DEMO_PRODUCTS,
  MALL_DEMO_SLUGS,
  type MallDemoProductSpec,
  resolveDemoAssetPath,
} from './demo-mall-assets.ts';

const API_BASE = (process.env.API_BASE ?? 'https://api-development-e387.up.railway.app').replace(
  /\/$/,
  '',
);
const TAG = '[DEV-MALL-DEMO]';
const DEMO_SLUG_SET = new Set<string>(MALL_DEMO_SLUGS);

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

function mimeFor(fileName: string): string {
  if (fileName.endsWith('.png')) return 'image/png';
  if (fileName.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

async function signInAdmin(): Promise<string> {
  const { status, body } = await j<{ session: { accessToken: string } }>(
    '/auth/social/mock-sign-in',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: SocialProvider.KAKAO, persona: MockAuthPersona.DEV_ADMIN }),
    },
  );
  assert(status >= 200 && status < 300, `admin sign-in failed: ${status}`);
  return body.session.accessToken;
}

async function mustOk<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const { status, body, raw } = await j<T>(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  assert(status >= 200 && status < 300, `${path} -> ${status} ${raw.slice(0, 400)}`);
  return body;
}

async function uploadAssetFile(
  path: string,
  token: string,
  assetFile: string,
  extra?: Record<string, string>,
): Promise<AdminMallProductDetailDto> {
  const filePath = resolveDemoAssetPath(assetFile);
  const bytes = readFileSync(filePath);
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: mimeFor(assetFile) }), assetFile);
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      form.append(key, value);
    }
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const raw = await res.text();
  assert(res.ok, `upload ${path} (${assetFile}) -> ${res.status} ${raw.slice(0, 300)}`);
  return JSON.parse(raw) as AdminMallProductDetailDto;
}

async function assertDevelopmentOnly() {
  const { status, body: health } = await j<{
    status: string;
    railwayEnvironment?: string;
    appVariant?: string;
  }>('/health');
  assert(status >= 200 && status < 300, `health failed: ${status}`);
  assert(health.status === 'ok', 'health not ok');
  if (health.railwayEnvironment) {
    assert(health.railwayEnvironment === 'development', `blocked env=${health.railwayEnvironment}`);
  }
  if (health.appVariant) {
    assert(health.appVariant === 'development', `blocked variant=${health.appVariant}`);
  }
  const api = API_BASE.toLowerCase();
  assert(!api.includes('production'), `blocked API_BASE=${API_BASE}`);
}

async function replaceGalleryImages(
  productId: string,
  token: string,
  galleryFiles: string[],
): Promise<void> {
  const detail = await mustOk<AdminMallProductDetailDto>(
    `/admin/mall/products/${productId}`,
    token,
  );
  for (const image of detail.images) {
    await mustOk(`/admin/mall/products/${productId}/images/${image.id}`, token, {
      method: 'DELETE',
    });
  }
  for (const file of galleryFiles) {
    await uploadAssetFile(`/admin/mall/products/${productId}/images`, token, file);
  }
}

async function pauseOrphanProducts(token: string): Promise<number> {
  const list = await mustOk<Array<{ id: string; slug: string; status: string }>>(
    '/admin/mall/products',
    token,
  );
  let paused = 0;
  for (const item of list) {
    if (DEMO_SLUG_SET.has(item.slug)) continue;
    if (item.status === MallProductStatus.PAUSED) continue;
    await mustOk(`/admin/mall/products/${item.id}`, token, {
      method: 'PATCH',
      body: JSON.stringify({ status: MallProductStatus.PAUSED }),
    });
    paused++;
    console.log(`${TAG} paused orphan slug=${item.slug} id=${item.id}`);
  }
  return paused;
}

async function upsertDemoProduct(token: string, demo: MallDemoProductSpec): Promise<string> {
  const list = await mustOk<Array<{ id: string; slug: string; name: string }>>(
    '/admin/mall/products',
    token,
  );
  const existing =
    list.find((item) => item.slug === demo.slug) ?? list.find((item) => item.name === demo.name);

  const payload = {
    name: demo.name,
    slug: demo.slug,
    shortDescription: demo.shortDescription,
    coinPrice: demo.coinPrice,
    stock: demo.stock,
    categoryId: demo.categoryId,
    status: MallProductStatus.ACTIVE,
    badge: demo.badge ?? null,
    exchangeGuide: demo.exchangeGuide,
    usageGuide: demo.usageGuide ?? null,
    validityGuide: demo.validityGuide ?? null,
    exchangeRefundGuide: demo.exchangeRefundGuide ?? null,
    noticeGuide: demo.noticeGuide ?? null,
    sortOrder: demo.sortOrder,
  };

  const product = existing
    ? await mustOk<{ id: string }>(`/admin/mall/products/${existing.id}`, token, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
    : await mustOk<{ id: string }>('/admin/mall/products', token, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

  const productId = product.id;

  await uploadAssetFile(`/admin/mall/products/${productId}/cover`, token, demo.cover);
  await replaceGalleryImages(productId, token, demo.gallery);

  const blocks: Array<{
    id?: string;
    type: MallContentBlockType;
    sortOrder: number;
    text?: string | null;
    imageObjectKey?: string | null;
  }> = [];

  let order = 0;
  for (const block of demo.contentBlocks) {
    if (block.type === MallContentBlockType.IMAGE) {
      const uploaded = await uploadAssetFile(
        `/admin/mall/products/${productId}/content-blocks/image`,
        token,
        block.file,
        { sortOrder: String(100 + order) },
      );
      const imageBlock = uploaded.contentBlocks
        .filter((item) => item.type === MallContentBlockType.IMAGE)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .at(-1);
      assert(imageBlock, `image block missing after upload (${block.file})`);
      blocks.push({
        id: imageBlock.id,
        type: MallContentBlockType.IMAGE,
        sortOrder: order++,
        imageObjectKey: imageBlock.imageObjectKey ?? null,
      });
    } else {
      blocks.push({
        type: block.type,
        sortOrder: order++,
        text: block.text,
      });
    }
  }

  await mustOk(`/admin/mall/products/${productId}/content-blocks`, token, {
    method: 'PUT',
    body: JSON.stringify({ blocks }),
  });

  const imageCount = demo.contentBlocks.filter((b) => b.type === MallContentBlockType.IMAGE).length;
  console.log(
    `${TAG} seeded ${demo.name} (${productId}) cover=${demo.cover} gallery=${demo.gallery.length} images=${imageCount} blocks=${blocks.length}`,
  );
  return productId;
}

async function main() {
  await assertDevelopmentOnly();
  const token = await signInAdmin();

  const paused = await pauseOrphanProducts(token);
  console.log(`${TAG} orphan cleanup paused=${paused}`);

  const ids: string[] = [];
  for (const demo of MALL_DEMO_PRODUCTS) {
    ids.push(await upsertDemoProduct(token, demo));
  }

  console.log(`${TAG} COMPLETE products=${MALL_DEMO_PRODUCTS.length} ids=${ids.join(',')}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
