/**
 * DEV-only mall demo products with mixed content blocks.
 *
 *   $env:API_BASE='https://api-development-e387.up.railway.app'
 *   pnpm exec tsx scripts/seed-mall-demo.ts
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  MallContentBlockType,
  MallProductStatus,
  MockAuthPersona,
  SocialProvider,
} from '../packages/types/src/index.ts';

const API_BASE = (process.env.API_BASE ?? 'https://api-development-e387.up.railway.app').replace(
  /\/$/,
  '',
);
const TAG = '[DEV-MALL-DEMO]';
const SAMPLE_IMAGE = join(process.cwd(), 'apps/mobile/assets/images/icon.png');

const CATEGORY_GOLF = 'a1000001-0000-4000-8000-000000000001';
const CATEGORY_FOOD = 'a1000001-0000-4000-8000-000000000003';

type DemoProduct = {
  slug: string;
  name: string;
  shortDescription: string;
  coinPrice: string;
  stock: number;
  categoryId: string;
  badge?: string | null;
  exchangeGuide: string;
  textBlocks: Array<{ type: MallContentBlockType; text: string }>;
  imageCount: number;
};

const DEMO_PRODUCTS: DemoProduct[] = [
  {
    slug: 'dev-demo-uv-golf-cap',
    name: 'UV 차단 골프 모자',
    shortDescription: '햇빛은 막고 스타일은 살린 가벼운 라운딩 모자',
    coinPrice: '2200',
    stock: 30,
    categoryId: CATEGORY_GOLF,
    badge: 'NEW',
    exchangeGuide:
      '상품 수령 후 단순 변심 교환은 제한될 수 있으며, 불량 또는 오배송은 고객센터를 통해 문의해주세요.',
    textBlocks: [
      {
        type: MallContentBlockType.HEADING,
        text: '라운딩에 맞춘 가벼운 착용감',
      },
      {
        type: MallContentBlockType.TEXT,
        text:
          '가벼운 소재와 통기성 있는 구조로 장시간 착용에도 부담을 줄였습니다. 필드뿐 아니라 연습장, 일상에서도 편하게 사용할 수 있습니다.',
      },
      {
        type: MallContentBlockType.HEADING,
        text: '햇빛 차단에 도움을 주는 넓은 챙',
      },
      {
        type: MallContentBlockType.TEXT,
        text:
          '강한 햇빛 아래에서도 얼굴과 눈 주변을 가리는 데 도움을 주도록 설계했습니다.',
      },
      {
        type: MallContentBlockType.NOTICE,
        text: '색상은 재고 상황에 따라 랜덤 발송될 수 있습니다.',
      },
    ],
    imageCount: 2,
  },
  {
    slug: 'dev-demo-premium-golf-glove',
    name: '프리미엄 골프 장갑',
    shortDescription: '그립감과 착용감을 고려한 라운딩용 골프 장갑',
    coinPrice: '1800',
    stock: 50,
    categoryId: CATEGORY_GOLF,
    exchangeGuide:
      '구매 후 MY > 구매내역에서 교환 코드를 확인할 수 있습니다. 직접 수령 또는 택배 배송 중 선택 가능합니다.',
    textBlocks: [
      {
        type: MallContentBlockType.HEADING,
        text: '안정적인 그립감',
      },
      {
        type: MallContentBlockType.TEXT,
        text: '라운드 중 클럽을 잡을 때 손바닥 미끄럼을 줄이도록 설계된 데모용 골프 장갑입니다.',
      },
      {
        type: MallContentBlockType.HEADING,
        text: '통기성 메쉬',
      },
      {
        type: MallContentBlockType.TEXT,
        text: '손등과 손가락 사이에 통기 메쉬를 적용해 장시간 착용 시 쾌적함을 유지합니다.',
      },
      {
        type: MallContentBlockType.HEADING,
        text: '손목 밴드',
      },
      {
        type: MallContentBlockType.TEXT,
        text: '탄력 있는 밴드로 흘러내림을 줄이고 라운딩 동작에 방해되지 않도록 맞춤형 핏을 제공합니다.',
      },
      {
        type: MallContentBlockType.NOTICE,
        text: '세탁 시 중성세제를 사용하고 직사광선 건조는 피해주세요.',
      },
    ],
    imageCount: 2,
  },
  {
    slug: 'dev-demo-screen-drink-coupon',
    name: '스크린골프 음료 쿠폰',
    shortDescription: '게임 후 가볍게 사용할 수 있는 리워드 쿠폰',
    coinPrice: '900',
    stock: 100,
    categoryId: CATEGORY_FOOD,
    exchangeGuide: '구매 후 30일 이내 제휴 매장에서 사용해 주세요. 앱 구매내역 화면을 제시하면 됩니다.',
    textBlocks: [
      {
        type: MallContentBlockType.HEADING,
        text: '사용 가능 안내',
      },
      {
        type: MallContentBlockType.TEXT,
        text: '제휴 스크린골프 매장 내 카페/음료 코너에서 1회 사용 가능한 쿠폰입니다.',
      },
      {
        type: MallContentBlockType.HEADING,
        text: '유효기간',
      },
      {
        type: MallContentBlockType.TEXT,
        text: '구매일로부터 30일 이내 사용 가능합니다.',
      },
      {
        type: MallContentBlockType.HEADING,
        text: '사용 방법',
      },
      {
        type: MallContentBlockType.TEXT,
        text: '결제 시 쪼인존 앱 MY > 구매내역에서 쿠폰 바코드를 제시해 주세요.',
      },
      {
        type: MallContentBlockType.NOTICE,
        text: '타 쿠폰 및 프로모션과 중복 사용이 제한될 수 있습니다.',
      },
    ],
    imageCount: 1,
  },
];

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

async function uploadImage(path: string, token: string, extra?: Record<string, string>) {
  const form = new FormData();
  const bytes = readFileSync(SAMPLE_IMAGE);
  form.append('file', new Blob([bytes], { type: 'image/png' }), 'demo.png');
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
  assert(res.ok, `upload ${path} -> ${res.status} ${raw.slice(0, 300)}`);
  return JSON.parse(raw) as {
    id: string;
    contentBlocks: Array<{
      id: string;
      type: MallContentBlockType;
      sortOrder: number;
      imageObjectKey?: string | null;
    }>;
  };
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

async function upsertDemoProduct(token: string, demo: DemoProduct) {
  const list = await mustOk<
    Array<{ id: string; slug: string }>
  >('/admin/mall/products', token);
  const existing =
    list.find((item) => item.slug === demo.slug) ??
    list.find((item) => item.name === demo.name);

  const product = existing
    ? await mustOk<{ id: string }>(`/admin/mall/products/${existing.id}`, token, {
        method: 'PATCH',
        body: JSON.stringify({
          name: demo.name,
          slug: demo.slug,
          shortDescription: demo.shortDescription,
          coinPrice: demo.coinPrice,
          stock: demo.stock,
          categoryId: demo.categoryId,
          status: MallProductStatus.ACTIVE,
          badge: demo.badge ?? null,
          exchangeGuide: demo.exchangeGuide,
          sortOrder: 0,
        }),
      })
    : await mustOk<{ id: string }>('/admin/mall/products', token, {
        method: 'POST',
        body: JSON.stringify({
          name: demo.name,
          slug: demo.slug,
          shortDescription: demo.shortDescription,
          coinPrice: demo.coinPrice,
          stock: demo.stock,
          categoryId: demo.categoryId,
          status: MallProductStatus.ACTIVE,
          badge: demo.badge ?? null,
          exchangeGuide: demo.exchangeGuide,
          sortOrder: 0,
        }),
      });

  const productId = product.id;
  await uploadImage(`/admin/mall/products/${productId}/cover`, token);

  const imageBlocks: Array<{ id: string; imageObjectKey: string | null }> = [];
  for (let i = 0; i < demo.imageCount; i++) {
    const uploaded = await uploadImage(
      `/admin/mall/products/${productId}/content-blocks/image`,
      token,
      { sortOrder: String(100 + i) },
    );
    const imageBlock = uploaded.contentBlocks
      .filter((block) => block.type === MallContentBlockType.IMAGE)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .at(-1);
    assert(imageBlock, 'image block missing after upload');
    imageBlocks.push({
      id: imageBlock.id,
      imageObjectKey: imageBlock.imageObjectKey ?? null,
    });
  }

  const blocks: Array<{
    id?: string;
    type: MallContentBlockType;
    sortOrder: number;
    text?: string | null;
    imageObjectKey?: string | null;
  }> = [];
  let order = 0;
  for (const textBlock of demo.textBlocks) {
    blocks.push({
      type: textBlock.type,
      sortOrder: order++,
      text: textBlock.text,
    });
    if (textBlock.type === MallContentBlockType.TEXT && imageBlocks.length > 0) {
      const image = imageBlocks.shift();
      if (image) {
        blocks.push({
          id: image.id,
          type: MallContentBlockType.IMAGE,
          sortOrder: order++,
          imageObjectKey: image.imageObjectKey,
        });
      }
    }
  }
  for (const image of imageBlocks) {
    blocks.push({
      id: image.id,
      type: MallContentBlockType.IMAGE,
      sortOrder: order++,
      imageObjectKey: image.imageObjectKey,
    });
  }

  await mustOk(`/admin/mall/products/${productId}/content-blocks`, token, {
    method: 'PUT',
    body: JSON.stringify({ blocks }),
  });

  console.log(`${TAG} seeded ${demo.name} (${productId}) blocks=${blocks.length}`);
  return productId;
}

async function main() {
  await assertDevelopmentOnly();
  const token = await signInAdmin();

  for (const demo of DEMO_PRODUCTS) {
    await upsertDemoProduct(token, demo);
  }

  console.log(`${TAG} COMPLETE products=${DEMO_PRODUCTS.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
