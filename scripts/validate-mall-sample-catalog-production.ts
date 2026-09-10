/**
 * Production mall sample catalog quality gate.
 *
 *   pnpm exec tsx scripts/validate-mall-sample-catalog-production.ts
 */
import {
  MallContentBlockType,
  MallProductStatus,
  type AdminMallProductDetailDto,
} from '../packages/types/src/index.ts';
import {
  getSampleCatalogProductionSpecs,
  MALL_SAMPLE_PRODUCTION_SLUGS,
} from './demo-mall-assets.ts';

const DEFAULT_PRODUCTION_API = 'https://api-production-2d67e.up.railway.app';
const API_BASE = (process.env.API_BASE ?? DEFAULT_PRODUCTION_API).replace(/\/$/, '');
const TAG = '[validate-mall-sample-catalog-production]';

const LOGO_PATTERNS = [/icon\.png/i, /brandmark/i, /logo/i, /unsplash\.com/i, /placeholder/i];
const SAMPLE_SLUG_SET = new Set<string>(MALL_SAMPLE_PRODUCTION_SLUGS);

async function signInAdmin(): Promise<string> {
  const loginId = process.env.JJOIN_ADMIN_LOGIN_ID;
  const password = process.env.JJOIN_ADMIN_LOGIN_PASSWORD;
  if (!loginId || !password) {
    throw new Error(`${TAG} set JJOIN_ADMIN_LOGIN_ID and JJOIN_ADMIN_LOGIN_PASSWORD`);
  }
  const res = await fetch(`${API_BASE}/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ loginId, password }),
  });
  if (!res.ok) throw new Error(`${TAG} admin login failed: ${res.status}`);
  const body = (await res.json()) as { session: { accessToken: string } };
  return body.session.accessToken;
}

function isLogoLike(url: string | null | undefined): boolean {
  if (!url) return true;
  return LOGO_PATTERNS.some((re) => re.test(url));
}

function extractObjectKey(url: string): string | null {
  const match = url.match(/[?&]key=([^&]+)/);
  if (!match) return null;
  return decodeURIComponent(match[1]);
}

async function main() {
  const api = API_BASE.toLowerCase();
  if (!api.includes('production')) {
    throw new Error(`${TAG} blocked API_BASE=${API_BASE}`);
  }

  const token = await signInAdmin();
  const specs = getSampleCatalogProductionSpecs();

  const listRes = await fetch(`${API_BASE}/admin/mall/products`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  const allProducts = (await listRes.json()) as Array<{ id: string; slug: string; status: string }>;

  const mallListRes = await fetch(`${API_BASE}/mall/products?sort=recommended`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  const mallList = (await mallListRes.json()) as {
    items: Array<{ slug: string; coverImageUrl: string | null }>;
  };

  const sampleRows = allProducts.filter((p) => SAMPLE_SLUG_SET.has(p.slug));
  const duplicateSlugs = sampleRows
    .map((p) => p.slug)
    .filter((slug, index, arr) => arr.indexOf(slug) !== index);

  let realCover = 0;
  let coverMissing = 0;
  let logoPlaceholder = 0;
  let brokenImages = 0;
  let wrongPrefix = 0;
  let contentBlocksTotal = 0;
  let headingTotal = 0;
  let textTotal = 0;
  let imageTotal = 0;
  let noticeTotal = 0;

  const productReports: Array<Record<string, unknown>> = [];

  for (const spec of specs) {
    const row = allProducts.find((p) => p.slug === spec.productionSlug);
    if (!row) throw new Error(`${TAG} missing product slug=${spec.productionSlug}`);

    const detailRes = await fetch(`${API_BASE}/admin/mall/products/${row.id}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    const detail = (await detailRes.json()) as AdminMallProductDetailDto;

    const coverUrl = detail.coverImageUrl;
    if (coverUrl && !isLogoLike(coverUrl)) realCover++;
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
      const contentType = res.headers.get('content-type') ?? '';
      if (res.ok && !contentType.startsWith('image/')) brokenImages++;

      const key = extractObjectKey(url);
      if (key?.startsWith('development/')) wrongPrefix++;
      if (key && !key.startsWith('production/mall/products/')) wrongPrefix++;
    }

    const blocks = detail.contentBlocks;
    const blockImageCount = blocks.filter((b) => b.type === MallContentBlockType.IMAGE).length;
    contentBlocksTotal += blocks.length;
    headingTotal += blocks.filter((b) => b.type === MallContentBlockType.HEADING).length;
    textTotal += blocks.filter((b) => b.type === MallContentBlockType.TEXT).length;
    imageTotal += blockImageCount;
    noticeTotal += blocks.filter((b) => b.type === MallContentBlockType.NOTICE).length;

    const pass =
      row.status === MallProductStatus.ACTIVE &&
      Boolean(coverUrl) &&
      !isLogoLike(coverUrl) &&
      detail.images.length >= 2 &&
      blockImageCount >= 3 &&
      blocks.length >= 7;

    productReports.push({
      name: spec.name,
      slug: spec.productionSlug,
      status: row.status,
      galleryCount: detail.images.length,
      contentBlocks: blocks.length,
      contentImages: blocks.filter((b) => b.type === MallContentBlockType.IMAGE).length,
      hasExchangeGuide: Boolean(detail.exchangeGuide),
      hasPolicyFields: Boolean(
        detail.usageGuide ||
          detail.validityGuide ||
          detail.exchangeRefundGuide ||
          detail.noticeGuide,
      ),
      pass: pass ? 'PASS' : 'FAIL',
    });
  }

  const visibleSample = mallList.items.filter((p) => SAMPLE_SLUG_SET.has(p.slug));
  const visibleMissingCover = visibleSample.filter((p) => !p.coverImageUrl).length;

  const report = {
    Production_sample_products: specs.length,
    real_cover: realCover,
    cover_missing: coverMissing,
    logo_placeholder: logoPlaceholder,
    broken_images: brokenImages,
    wrong_prefix: wrongPrefix,
    content_blocks_total: contentBlocksTotal,
    HEADING: headingTotal,
    TEXT: textTotal,
    IMAGE: imageTotal,
    NOTICE: noticeTotal,
    duplicates: duplicateSlugs.length,
    list_visible_sample: visibleSample.length,
    list_cover_missing: visibleMissingCover,
    products: productReports,
  };

  console.log(JSON.stringify(report, null, 2));

  const fail =
    duplicateSlugs.length > 0 ||
    coverMissing > 0 ||
    logoPlaceholder > 0 ||
    brokenImages > 0 ||
    wrongPrefix > 0 ||
    visibleSample.length !== specs.length ||
    visibleMissingCover > 0 ||
    productReports.some((p) => p.pass === 'FAIL');

  if (fail) throw new Error(`${TAG} validation failed`);
  console.log(`${TAG} OK`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
