/**
 * DEV mall demo product + image asset SSOT.
 * Images live under apps/mobile/assets/demo/mall/.
 */
import { join } from 'node:path';
import { MallContentBlockType } from '../packages/types/src/index.ts';

export const MALL_DEMO_ASSET_DIR = join(process.cwd(), 'apps/mobile/assets/demo/mall');

const CATEGORY_GOLF = 'a1000001-0000-4000-8000-000000000001';
const CATEGORY_FOOD = 'a1000001-0000-4000-8000-000000000003';

export type MallDemoProductSpec = {
  slug: string;
  name: string;
  shortDescription: string;
  coinPrice: string;
  stock: number;
  categoryId: string;
  badge?: string | null;
  exchangeGuide: string;
  cover: string;
  gallery: string[];
  contentImages: string[];
  textBlocks: Array<{ type: MallContentBlockType; text: string }>;
};

export const MALL_DEMO_PRODUCTS: MallDemoProductSpec[] = [
  {
    slug: 'dev-demo-uv-golf-cap',
    name: 'UV 차단 골프 모자',
    shortDescription: '여름 라운드에 적합한 가벼운 UV 차단 골프 모자',
    coinPrice: '2200',
    stock: 30,
    categoryId: CATEGORY_GOLF,
    badge: 'NEW',
    exchangeGuide:
      '구매 후 MY > 구매내역에서 교환 코드를 확인할 수 있습니다. 직접 수령 또는 택배 배송 중 선택 가능합니다. 단순 변심 교환은 제한될 수 있습니다.',
    cover: 'uv-cap-cover.jpg',
    gallery: ['uv-cap-lifestyle.jpg', 'uv-cap-detail.jpg'],
    contentImages: ['uv-cap-content-1.jpg', 'uv-cap-content-2.jpg'],
    textBlocks: [
      {
        type: MallContentBlockType.HEADING,
        text: '장시간 야외 라운드에 적합한 UV 차단 모자',
      },
      {
        type: MallContentBlockType.TEXT,
        text:
          '가벼운 소재와 통기성 메쉬 패널로 땀과 열기를 빠르게 배출합니다. 필드·연습장·스크린 라운드 전후에도 편하게 착용할 수 있습니다.',
      },
      {
        type: MallContentBlockType.HEADING,
        text: '넓은 챙과 안정적인 핏',
      },
      {
        type: MallContentBlockType.TEXT,
        text:
          '햇빛이 강한 티잉그라운드에서도 얼굴과 눈 주변을 가려주는 넓은 챙을 적용했습니다. 뒤쪽 조절 밴드로 머리 둘레에 맞게 고정할 수 있습니다.',
      },
      {
        type: MallContentBlockType.NOTICE,
        text: '색상은 재고 상황에 따라 화이트/베이지 중 랜덤 발송될 수 있습니다.',
      },
    ],
  },
  {
    slug: 'dev-demo-premium-golf-glove',
    name: '프리미엄 골프 장갑',
    shortDescription: '그립감과 통기성을 고려한 라운드용 골프 장갑',
    coinPrice: '1800',
    stock: 50,
    categoryId: CATEGORY_GOLF,
    exchangeGuide:
      '구매 후 MY > 구매내역에서 교환 코드를 확인할 수 있습니다. 사이즈는 재고에 따라 좌타/우타 중 랜덤 발송될 수 있습니다.',
    cover: 'golf-glove-cover.jpg',
    gallery: ['golf-glove-grip.jpg', 'golf-glove-detail.jpg'],
    contentImages: ['golf-glove-content-1.jpg', 'golf-glove-content-2.jpg'],
    textBlocks: [
      {
        type: MallContentBlockType.HEADING,
        text: '안정적인 그립과 밀착 핏',
      },
      {
        type: MallContentBlockType.TEXT,
        text:
          '손바닥 미끄럼을 줄이는 실리콘 그립 패턴과 손가락 곡선에 맞춘 패턴으로 클럽을 잡을 때 흔들림을 줄여줍니다.',
      },
      {
        type: MallContentBlockType.HEADING,
        text: '통기 홀과 메쉬 소재',
      },
      {
        type: MallContentBlockType.TEXT,
        text:
          '손등과 손가락 사이에 통기 홀을 배치해 장시간 라운드 중에도 쾌적한 착용감을 유지합니다.',
      },
      {
        type: MallContentBlockType.HEADING,
        text: '손목 밴드로 흘러내림 방지',
      },
      {
        type: MallContentBlockType.TEXT,
        text:
          '탄력 있는 벨크로 밴드가 손목을 안정적으로 고정해 스윙 동작 중에도 장갑이 밀리지 않도록 돕습니다.',
      },
      {
        type: MallContentBlockType.NOTICE,
        text: '세탁 시 중성세제를 사용하고 직사광선 건조는 피해주세요.',
      },
    ],
  },
  {
    slug: 'dev-demo-screen-drink-coupon',
    name: '스크린골프 음료 쿠폰',
    shortDescription: '라운드 후 제휴 매장에서 사용하는 음료 교환 쿠폰',
    coinPrice: '900',
    stock: 100,
    categoryId: CATEGORY_FOOD,
    exchangeGuide:
      '구매일로부터 30일 이내 제휴 스크린골프 매장에서 사용해 주세요. 환불·재발급은 불가하며, 앱 구매내역 화면을 제시하면 됩니다.',
    cover: 'drink-coupon-cover.jpg',
    gallery: ['drink-coupon-lounge.jpg', 'drink-coupon-exchange.jpg'],
    contentImages: ['drink-coupon-content-1.jpg'],
    textBlocks: [
      {
        type: MallContentBlockType.HEADING,
        text: '라운드 후 가볍게 즐기는 음료 한 잔',
      },
      {
        type: MallContentBlockType.TEXT,
        text:
          '제휴 스크린골프 매장 내 카페/음료 코너에서 아메리카노, 에이드, 탄산음료 등 지정 메뉴 1잔으로 교환할 수 있습니다.',
      },
      {
        type: MallContentBlockType.HEADING,
        text: '사용 가능 장소',
      },
      {
        type: MallContentBlockType.TEXT,
        text:
          '쪼인존 제휴 스크린골프 라운지 전 매장에서 사용 가능합니다. 매장별 제공 메뉴는 상이할 수 있습니다.',
      },
      {
        type: MallContentBlockType.HEADING,
        text: '교환 방법',
      },
      {
        type: MallContentBlockType.TEXT,
        text:
          '결제 시 쪼인존 앱 MY > 구매내역에서 쿠폰 바코드를 직원에게 제시해 주세요. 1인 1회 사용 가능합니다.',
      },
      {
        type: MallContentBlockType.NOTICE,
        text: '타 쿠폰·프로모션과 중복 사용이 제한될 수 있으며, 유효기간 경과 후에는 사용할 수 없습니다.',
      },
    ],
  },
];

export function resolveDemoAssetPath(fileName: string): string {
  return join(MALL_DEMO_ASSET_DIR, fileName);
}

export function listRequiredDemoAssetFiles(): string[] {
  const files = new Set<string>();
  for (const product of MALL_DEMO_PRODUCTS) {
    files.add(product.cover);
    for (const file of product.gallery) files.add(file);
    for (const file of product.contentImages) files.add(file);
  }
  return [...files].sort();
}
