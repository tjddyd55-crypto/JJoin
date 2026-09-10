/**
 * Publish DEV-verified mall sample catalog to Production (DB + production R2).
 *
 * Does NOT run seed-mall-demo.ts or reference development/ R2 keys.
 *
 * Usage (explicit Production publish only):
 *   CONFIRM_PRODUCTION_MALL_SAMPLE_PUBLISH=1 pnpm exec tsx scripts/publish-mall-sample-catalog-production.ts
 *
 * Credentials: JJOIN_ADMIN_LOGIN_ID / JJOIN_ADMIN_LOGIN_PASSWORD
 * Optional: API_BASE (defaults to Production API)
 */
import { existsSync, readFileSync } from 'node:fs';
import {
  MallContentBlockType,
  MallProductStatus,
  type AdminMallProductDetailDto,
} from '../packages/types/src/index.ts';
import {
  getSampleCatalogProductionSpecs,
  listRequiredDemoAssetFiles,
  MALL_SAMPLE_PRODUCTION_SLUGS,
  type MallSampleCatalogProductSpec,
  resolveDemoAssetPath,
} from './demo-mall-assets.ts';

const DEFAULT_PRODUCTION_API = 'https://api-production-2d67e.up.railway.app';
const API_BASE = (process.env.API_BASE ?? DEFAULT_PRODUCTION_API).replace(/\/$/, '');
const TAG = '[publish-mall-sample-catalog-production]';
const MIN_ASSET_BYTES = 8_000;
const FORBIDDEN_ASSET_PATTERNS = [/icon\.png/i, /brandmark/i, /logo/i, /placeholder/i];

const SAMPLE_SLUG_SET = new Set<string>(MALL_SAMPLE_PRODUCTION_SLUGS);

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`${TAG} ${msg}`);
}

function mimeFor(fileName: string): string {
  if (fileName.endsWith('.png')) return 'image/png';
  if (fileName.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

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

async function assertProductionOnly(): Promise<void> {
  assert(
    process.env.CONFIRM_PRODUCTION_MALL_SAMPLE_PUBLISH === '1',
    'set CONFIRM_PRODUCTION_MALL_SAMPLE_PUBLISH=1 to publish Production sample catalog',
  );

  const api = API_BASE.toLowerCase();
  assert(api.includes('production'), `blocked API_BASE=${API_BASE} (production required)`);
  assert(!api.includes('development'), `blocked API_BASE=${API_BASE}`);

  const { status, body: health } = await j<{
    status: string;
    railwayEnvironment?: string;
    appVariant?: string;
  }>('/health');
  assert(status >= 200 && status < 300, `health failed: ${status}`);
  assert(health.status === 'ok', 'health not ok');
  if (health.railwayEnvironment) {
    assert(
      health.railwayEnvironment === 'production',
      `blocked railwayEnvironment=${health.railwayEnvironment}`,
    );
  }
  if (health.appVariant) {
    assert(health.appVariant === 'production', `blocked appVariant=${health.appVariant}`);
  }
}

function assertDemoAssetsReady(): void {
  const missing: string[] = [];
  const tooSmall: string[] = [];
  const forbidden: string[] = [];

  for (const fileName of listRequiredDemoAssetFiles()) {
    if (FORBIDDEN_ASSET_PATTERNS.some((re) => re.test(fileName))) {
      forbidden.push(fileName);
    }
    const filePath = resolveDemoAssetPath(fileName);
    if (!existsSync(filePath)) {
      missing.push(fileName);
      continue;
    }
    const size = readFileSync(filePath).length;
    if (size < MIN_ASSET_BYTES) tooSmall.push(`${fileName}(${size})`);
  }

  assert(forbidden.length === 0, `forbidden assets: ${forbidden.join(', ')}`);
  assert(missing.length === 0, `missing assets: ${missing.join(', ')}`);
  assert(tooSmall.length === 0, `invalid assets (too small): ${tooSmall.join(', ')}`);
}

async function signInAdmin(): Promise<string> {
  const loginId = process.env.JJOIN_ADMIN_LOGIN_ID;
  const password = process.env.JJOIN_ADMIN_LOGIN_PASSWORD;
  assert(loginId && password, 'set JJOIN_ADMIN_LOGIN_ID and JJOIN_ADMIN_LOGIN_PASSWORD');

  const { status, body } = await j<{ session: { accessToken: string } }>('/auth/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId, password }),
  });
  assert(status >= 200 && status < 300, `admin login failed: ${status}`);
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

async function upsertSampleProduct(
  token: string,
  spec: MallSampleCatalogProductSpec,
): Promise<{ id: string; created: boolean }> {
  const list = await mustOk<Array<{ id: string; slug: string; name: string }>>(
    '/admin/mall/products',
    token,
  );
  const existing = list.find((item) => item.slug === spec.productionSlug);

  const payload = {
    name: spec.name,
    slug: spec.productionSlug,
    shortDescription: spec.shortDescription,
    coinPrice: spec.coinPrice,
    stock: spec.stock,
    categoryId: spec.categoryId,
    status: MallProductStatus.ACTIVE,
    badge: spec.badge ?? null,
    exchangeGuide: spec.exchangeGuide,
    usageGuide: spec.usageGuide ?? null,
    validityGuide: spec.validityGuide ?? null,
    exchangeRefundGuide: spec.exchangeRefundGuide ?? null,
    noticeGuide: spec.noticeGuide ?? null,
    sortOrder: spec.sortOrder,
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

  await uploadAssetFile(`/admin/mall/products/${productId}/cover`, token, spec.cover);
  await replaceGalleryImages(productId, token, spec.gallery);

  const blocks: Array<{
    id?: string;
    type: MallContentBlockType;
    sortOrder: number;
    text?: string | null;
    imageObjectKey?: string | null;
  }> = [];

  let order = 0;
  for (const block of spec.contentBlocks) {
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

  const detail = await mustOk<AdminMallProductDetailDto>(
    `/admin/mall/products/${productId}`,
    token,
  );
  assert(detail.coverImageUrl, `cover missing after publish slug=${spec.productionSlug}`);
  assert(detail.status === MallProductStatus.ACTIVE, `not ACTIVE slug=${spec.productionSlug}`);

  console.log(
    `${TAG} ${existing ? 'updated' : 'created'} ${spec.name} slug=${spec.productionSlug} id=${productId} gallery=${detail.images.length} blocks=${detail.contentBlocks.length}`,
  );

  return { id: productId, created: !existing };
}

async function main() {
  await assertProductionOnly();
  assertDemoAssetsReady();

  const token = await signInAdmin();
  const specs = getSampleCatalogProductionSpecs();
  assert(specs.length === MALL_SAMPLE_PRODUCTION_SLUGS.length, 'sample catalog size mismatch');

  let created = 0;
  let updated = 0;
  const ids: string[] = [];

  for (const spec of specs) {
    assert(SAMPLE_SLUG_SET.has(spec.productionSlug), `unexpected slug=${spec.productionSlug}`);
    const result = await upsertSampleProduct(token, spec);
    ids.push(result.id);
    if (result.created) created++;
    else updated++;
  }

  const duplicateIds = ids.length - new Set(ids).size;
  assert(duplicateIds === 0, `duplicate product ids=${duplicateIds}`);

  console.log(
    JSON.stringify({
      tag: TAG,
      api: API_BASE,
      products: specs.length,
      created,
      updated,
      ids,
      slugs: specs.map((item) => item.productionSlug),
    }),
  );
  console.log(`${TAG} COMPLETE`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
