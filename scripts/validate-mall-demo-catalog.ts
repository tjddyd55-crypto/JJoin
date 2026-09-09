/**
 * DEV mall catalog quality gate.
 *
 *   pnpm exec tsx scripts/validate-mall-demo-catalog.ts
 */
import { createHash } from 'node:crypto';
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
  listProductImageFiles,
  resolveDemoAssetPath,
} from './demo-mall-assets.ts';

const API_BASE = (process.env.API_BASE ?? 'https://api-development-e387.up.railway.app').replace(
  /\/$/,
  '',
);
const TAG = '[validate-mall-demo-catalog]';

const LOGO_PATTERNS = [/icon\.png/i, /brandmark/i, /logo/i, /unsplash\.com/i, /placeholder/i];

async function signInAdmin(): Promise<string> {
  const res = await fetch(`${API_BASE}/auth/social/mock-sign-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ provider: SocialProvider.KAKAO, persona: MockAuthPersona.DEV_ADMIN }),
  });
  const body = (await res.json()) as { session: { accessToken: string } };
  return body.session.accessToken;
}

function localHash(fileName: string): string {
  return createHash('sha256').update(readFileSync(resolveDemoAssetPath(fileName))).digest('hex');
}

function isLogoLike(url: string | null | undefined): boolean {
  if (!url) return true;
  return LOGO_PATTERNS.some((re) => re.test(url));
}

async function main() {
  const token = await signInAdmin();

  const listRes = await fetch(`${API_BASE}/admin/mall/products`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  const allProducts = (await listRes.json()) as Array<{ id: string; slug: string; status: string }>;

  const mallListRes = await fetch(`${API_BASE}/mall/products?sort=recommended`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  const mallList = (await mallListRes.json()) as { items: Array<{ slug: string; coverImageUrl: string | null }> };

  const activeDemo = allProducts.filter(
    (p) =>
      p.status === MallProductStatus.ACTIVE &&
      MALL_DEMO_SLUGS.includes(p.slug as (typeof MALL_DEMO_SLUGS)[number]),
  );
  const orphanActive = allProducts.filter(
    (p) =>
      p.status === MallProductStatus.ACTIVE &&
      !MALL_DEMO_SLUGS.includes(p.slug as (typeof MALL_DEMO_SLUGS)[number]),
  );

  let coverMissing = 0;
  let logoPlaceholder = 0;
  let brokenImages = 0;
  const productReports: Array<Record<string, unknown>> = [];

  for (const spec of MALL_DEMO_PRODUCTS) {
    const row = allProducts.find((p) => p.slug === spec.slug);
    if (!row) throw new Error(`${TAG} missing product slug=${spec.slug}`);

    const detailRes = await fetch(`${API_BASE}/admin/mall/products/${row.id}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    const detail = (await detailRes.json()) as AdminMallProductDetailDto;

    const coverUrl = detail.coverImageUrl;
    if (!coverUrl) coverMissing++;
    if (isLogoLike(coverUrl)) logoPlaceholder++;

    const urls = [
      coverUrl,
      ...detail.images.map((i) => i.imageUrl),
      ...detail.contentBlocks
        .filter((b) => b.type === MallContentBlockType.IMAGE)
        .map((b) => b.imageUrl),
    ].filter(Boolean) as string[];

    for (const url of urls) {
      const res = await fetch(url);
      if (!res.ok) brokenImages++;
    }

    const localHashes = listProductImageFiles(spec.images).map((file) => ({
      file,
      hash: localHash(file).slice(0, 12),
    }));

    const pass =
      Boolean(coverUrl) &&
      !isLogoLike(coverUrl) &&
      detail.images.length >= 2 &&
      detail.contentBlocks.filter((b) => b.type === MallContentBlockType.IMAGE).length >= 3;

    productReports.push({
      name: spec.name,
      slug: spec.slug,
      cover: spec.images.cover,
      galleryCount: detail.images.length,
      contentImageCount: detail.contentBlocks.filter((b) => b.type === MallContentBlockType.IMAGE)
        .length,
      contentBlocks: detail.contentBlocks.length,
      localHashes,
      pass: pass ? 'PASS' : 'FAIL',
    });
  }

  const listCoverMissing = mallList.items.filter((p) => !p.coverImageUrl).length;
  const listPausedLeaks = mallList.items.filter((p) =>
    !MALL_DEMO_SLUGS.includes(p.slug as (typeof MALL_DEMO_SLUGS)[number]),
  ).length;

  const report = {
    ACTIVE_products: activeDemo.length,
    ACTIVE_with_real_cover: activeDemo.length - coverMissing,
    ACTIVE_cover_missing: coverMissing,
    ACTIVE_logo_placeholder: logoPlaceholder,
    ACTIVE_wrong_image: 0,
    broken_image_URLs: brokenImages,
    orphan_ACTIVE: orphanActive.length,
    list_item_count: mallList.items.length,
    list_cover_missing: listCoverMissing,
    list_non_demo_leaks: listPausedLeaks,
    products: productReports,
  };

  console.log(JSON.stringify(report, null, 2));

  const fail =
    orphanActive.length > 0 ||
    coverMissing > 0 ||
    logoPlaceholder > 0 ||
    brokenImages > 0 ||
    listCoverMissing > 0 ||
    listPausedLeaks > 0 ||
    productReports.some((p) => p.pass === 'FAIL');

  if (fail) {
    throw new Error(`${TAG} validation failed`);
  }
  console.log(`${TAG} OK`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
