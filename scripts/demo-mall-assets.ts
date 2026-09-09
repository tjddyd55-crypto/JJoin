/**
 * DEV mall demo product + image asset SSOT.
 * Images live under apps/mobile/assets/demo/mall/.
 */
import { join } from 'node:path';
import { MallContentBlockType } from '../packages/types/src/index.ts';

export const MALL_DEMO_ASSET_DIR = join(process.cwd(), 'apps/mobile/assets/demo/mall');

const CATEGORY_GOLF = 'a1000001-0000-4000-8000-000000000001';
const CATEGORY_APPAREL = 'a1000001-0000-4000-8000-000000000002';
const CATEGORY_FOOD = 'a1000001-0000-4000-8000-000000000003';
const CATEGORY_OTHER = 'a1000001-0000-4000-8000-000000000004';

export const MALL_DEMO_SLUGS = [
  'dev-demo-uv-golf-cap',
  'dev-demo-premium-golf-glove',
  'dev-demo-cooling-arm-sleeve',
  'dev-demo-soft-golf-towel',
  'dev-demo-practice-golf-ball-6',
  'dev-demo-home-putting-mat',
  'dev-demo-screen-drink-coupon',
  'dev-demo-screen-practice-pass',
] as const;

export type MallDemoContentBlock =
  | { type: MallContentBlockType.HEADING; text: string }
  | { type: MallContentBlockType.TEXT; text: string }
  | { type: MallContentBlockType.IMAGE; file: string }
  | { type: MallContentBlockType.NOTICE; text: string };

/** Named image roles — avoids index/order mix-ups in download + seed. */
export type MallDemoProductImages = {
  cover: string;
  lifestyle: string;
  detail: string;
  galleryExtra?: string;
  content1: string;
  content2: string;
  content3: string;
};

export type MallDemoProductSpec = {
  slug: string;
  name: string;
  shortDescription: string;
  coinPrice: string;
  stock: number;
  categoryId: string;
  sortOrder: number;
  badge?: string | null;
  exchangeGuide: string;
  usageGuide?: string | null;
  validityGuide?: string | null;
  exchangeRefundGuide?: string | null;
  noticeGuide?: string | null;
  images: MallDemoProductImages;
  cover: string;
  gallery: string[];
  contentBlocks: MallDemoContentBlock[];
};

type MallDemoProductDraft = Omit<MallDemoProductSpec, 'cover' | 'gallery'>;

export function resolveProductGallery(images: MallDemoProductImages): string[] {
  const gallery = [images.lifestyle, images.detail];
  if (images.galleryExtra) gallery.push(images.galleryExtra);
  return gallery;
}

export function listProductImageFiles(images: MallDemoProductImages): string[] {
  const files = [
    images.cover,
    images.lifestyle,
    images.detail,
    images.content1,
    images.content2,
    images.content3,
  ];
  if (images.galleryExtra) files.push(images.galleryExtra);
  return files;
}

function finalizeProduct(draft: MallDemoProductDraft): MallDemoProductSpec {
  return {
    ...draft,
    cover: draft.images.cover,
    gallery: resolveProductGallery(draft.images),
  };
}

const MALL_DEMO_PRODUCT_DRAFTS: MallDemoProductDraft[] = [
  {
    slug: 'dev-demo-uv-golf-cap',
    name: 'UV 차단 골프 모자',
    shortDescription: '여름 라운드에 적합한 가벼운 UV 차단 골프 모자',
    coinPrice: '2200',
    stock: 30,
    categoryId: CATEGORY_APPAREL,
    sortOrder: 1,
    badge: 'NEW',
    exchangeGuide:
      '구매 후 MY > 구매내역에서 교환 코드를 확인할 수 있습니다. 직접 수령 또는 택배 배송 중 선택 가능합니다.',
    exchangeRefundGuide:
      '단순 변심 교환은 제한될 수 있으며, 불량 또는 오배송은 고객센터를 통해 문의해주세요.',
    noticeGuide: '색상은 재고 상황에 따라 화이트/베이지 중 랜덤 발송될 수 있습니다.',
    images: {
      cover: 'uv-cap-cover.jpg',
      lifestyle: 'uv-cap-lifestyle.jpg',
      detail: 'uv-cap-detail.jpg',
      galleryExtra: 'uv-cap-mesh.jpg',
      content1: 'uv-cap-content-1.jpg',
      content2: 'uv-cap-content-2.jpg',
      content3: 'uv-cap-content-3.jpg',
    },
    contentBlocks: [
      {
        type: MallContentBlockType.HEADING,
        text: '장시간 야외 라운드에 적합한 UV 차단 모자',
      },
      {
        type: MallContentBlockType.TEXT,
        text:
          '가벼운 소재와 통기성 메쉬 패널로 땀과 열기를 빠르게 배출합니다. 필드·연습장·스크린 라운드 전후에도 편하게 착용할 수 있습니다.',
      },
      { type: MallContentBlockType.IMAGE, file: 'uv-cap-content-1.jpg' },
      {
        type: MallContentBlockType.HEADING,
        text: '넓은 챙과 안정적인 핏',
      },
      {
        type: MallContentBlockType.TEXT,
        text:
          '햇빛이 강한 티잉그라운드에서도 얼굴과 눈 주변을 가려주는 넓은 챙을 적용했습니다. 뒤쪽 조절 밴드로 머리 둘레에 맞게 고정할 수 있습니다.',
      },
      { type: MallContentBlockType.IMAGE, file: 'uv-cap-content-2.jpg' },
      {
        type: MallContentBlockType.HEADING,
        text: '메쉬 디테일과 라운드 착용감',
      },
      {
        type: MallContentBlockType.TEXT,
        text:
          '후면 메쉬 패널이 두피 열기를 분산시켜 여름 라운드 중에도 무겁지 않습니다. 가벼운 무게로 장시간 착용해도 편안합니다.',
      },
      { type: MallContentBlockType.IMAGE, file: 'uv-cap-content-3.jpg' },
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
    sortOrder: 2,
    exchangeGuide:
      '구매 후 MY > 구매내역에서 교환 코드를 확인할 수 있습니다. 직접 수령 또는 택배 배송 중 선택 가능합니다.',
    exchangeRefundGuide:
      '사이즈는 재고에 따라 좌타/우타 중 랜덤 발송될 수 있으며, 단순 변심 교환은 제한될 수 있습니다.',
    noticeGuide: '세탁 시 중성세제를 사용하고 직사광선 건조는 피해주세요.',
    images: {
      cover: 'golf-glove-cover.jpg',
      lifestyle: 'golf-glove-grip.jpg',
      detail: 'golf-glove-detail.jpg',
      galleryExtra: 'golf-glove-wrist.jpg',
      content1: 'golf-glove-content-1.jpg',
      content2: 'golf-glove-content-2.jpg',
      content3: 'golf-glove-content-3.jpg',
    },
    contentBlocks: [
      {
        type: MallContentBlockType.HEADING,
        text: '안정적인 그립과 밀착 핏',
      },
      {
        type: MallContentBlockType.TEXT,
        text:
          '손바닥 미끄럼을 줄이는 실리콘 그립 패턴과 손가락 곡선에 맞춘 패턴으로 클럽을 잡을 때 흔들림을 줄여줍니다.',
      },
      { type: MallContentBlockType.IMAGE, file: 'golf-glove-content-1.jpg' },
      {
        type: MallContentBlockType.HEADING,
        text: '통기 홀과 메쉬 소재',
      },
      {
        type: MallContentBlockType.TEXT,
        text:
          '손등과 손가락 사이에 통기 홀을 배치해 장시간 라운드 중에도 쾌적한 착용감을 유지합니다.',
      },
      { type: MallContentBlockType.IMAGE, file: 'golf-glove-content-2.jpg' },
      {
        type: MallContentBlockType.HEADING,
        text: '손목 밴드와 관리 방법',
      },
      {
        type: MallContentBlockType.TEXT,
        text:
          '탄력 있는 벨크로 밴드가 손목을 안정적으로 고정해 스윙 동작 중에도 장갑이 밀리지 않도록 돕습니다. 라운드 후에는 그늘에서 건조하고 직사광선은 피해주세요.',
      },
      { type: MallContentBlockType.IMAGE, file: 'golf-glove-content-3.jpg' },
      {
        type: MallContentBlockType.NOTICE,
        text: '세탁 시 중성세제를 사용하고 직사광선 건조는 피해주세요.',
      },
    ],
  },
  {
    slug: 'dev-demo-cooling-arm-sleeve',
    name: '쿨링 골프 암슬리브',
    shortDescription: '여름 라운드용 쿨링·자외선 대응 암슬리브',
    coinPrice: '1600',
    stock: 45,
    categoryId: CATEGORY_APPAREL,
    sortOrder: 3,
    badge: '인기',
    exchangeGuide:
      '구매 후 MY > 구매내역에서 교환 코드를 확인할 수 있습니다. 직접 수령 또는 택배 배송 중 선택 가능합니다.',
    exchangeRefundGuide: '단순 변심 교환은 제한될 수 있습니다.',
    noticeGuide: '사이즈는 팔둘레에 맞게 선택해 주세요. 세탁 시 찬물 단독 세탁을 권장합니다.',
    images: {
      cover: 'arm-sleeve-cover.jpg',
      lifestyle: 'arm-sleeve-lifestyle.jpg',
      detail: 'arm-sleeve-detail.jpg',
      content1: 'arm-sleeve-content-1.jpg',
      content2: 'arm-sleeve-content-2.jpg',
      content3: 'arm-sleeve-content-3.jpg',
    },
    contentBlocks: [
      {
        type: MallContentBlockType.HEADING,
        text: '여름 라운드 쿨링 암슬리브',
      },
      {
        type: MallContentBlockType.TEXT,
        text:
          '쿨링 원단이 피부 표면 열기를 빠르게 낮춰 장시간 야외 라운드에서도 팔 부위를 시원하게 유지합니다.',
      },
      { type: MallContentBlockType.IMAGE, file: 'arm-sleeve-content-1.jpg' },
      {
        type: MallContentBlockType.HEADING,
        text: '신축성과 자외선 대응',
      },
      {
        type: MallContentBlockType.TEXT,
        text:
          '4-way 스트레치 소재가 스윙 동작을 따라가며 팔꿈치 굽힘에도 밀림이 적습니다. 자외선 차단 등급을 고려한 원단으로 티잉그라운드 노출을 줄여줍니다.',
      },
      { type: MallContentBlockType.IMAGE, file: 'arm-sleeve-content-2.jpg' },
      {
        type: MallContentBlockType.HEADING,
        text: '통기 메쉬와 착용 팁',
      },
      {
        type: MallContentBlockType.TEXT,
        text:
          '안쪽 메쉬 라인이 땀 배출을 돕고, 손목·팔뚝 끝단 밴드가 흘러내림을 방지합니다. 좌·우 한 쌍 구성입니다.',
      },
      { type: MallContentBlockType.IMAGE, file: 'arm-sleeve-content-3.jpg' },
      {
        type: MallContentBlockType.NOTICE,
        text: '사이즈는 팔둘레에 맞게 선택해 주세요. 세탁 시 찬물 단독 세탁을 권장합니다.',
      },
    ],
  },
  {
    slug: 'dev-demo-soft-golf-towel',
    name: '소프트 터치 골프 타월',
    shortDescription: '클럽·볼 세척에 적합한 흡수력 좋은 골프 타월',
    coinPrice: '1400',
    stock: 60,
    categoryId: CATEGORY_GOLF,
    sortOrder: 4,
    exchangeGuide:
      '구매 후 MY > 구매내역에서 교환 코드를 확인할 수 있습니다. 직접 수령 또는 택배 배송 중 선택 가능합니다.',
    exchangeRefundGuide: '단순 변심 교환은 제한될 수 있습니다.',
    noticeGuide: '최초 사용 전 미지근한 물로 1회 세탁 후 사용을 권장합니다.',
    images: {
      cover: 'towel-cover.jpg',
      lifestyle: 'towel-lifestyle.jpg',
      detail: 'towel-detail.jpg',
      content1: 'towel-content-1.jpg',
      content2: 'towel-content-2.jpg',
      content3: 'towel-content-3.jpg',
    },
    contentBlocks: [
      {
        type: MallContentBlockType.HEADING,
        text: '라운드 중 클럽·볼 세척용 타월',
      },
      {
        type: MallContentBlockType.TEXT,
        text:
          '미세 섬유 소재가 그루브와 볼 표면의 수분·잔디를 빠르게 흡수합니다. 티샷 전 클럽 페이스를 닦거나 퍼팅 전 볼을 정리할 때 활용할 수 있습니다.',
      },
      { type: MallContentBlockType.IMAGE, file: 'towel-content-1.jpg' },
      {
        type: MallContentBlockType.HEADING,
        text: '뛰어난 흡수력과 내구성',
      },
      {
        type: MallContentBlockType.TEXT,
        text:
          '여러 번 사용해도 흡수력이 빠르게 떨어지지 않도록 밀도 높은 직조를 적용했습니다. 라운드 후 세탁기 사용이 가능합니다.',
      },
      { type: MallContentBlockType.IMAGE, file: 'towel-content-2.jpg' },
      {
        type: MallContentBlockType.HEADING,
        text: '카라비너 고리 활용',
      },
      {
        type: MallContentBlockType.TEXT,
        text:
          '백 후크나 벨트에 걸 수 있는 카라비너가 포함되어 있어 라운드 중 분실을 줄이고 필요할 때 바로 꺼내 쓸 수 있습니다.',
      },
      { type: MallContentBlockType.IMAGE, file: 'towel-content-3.jpg' },
      {
        type: MallContentBlockType.NOTICE,
        text: '최초 사용 전 미지근한 물로 1회 세탁 후 사용을 권장합니다.',
      },
    ],
  },
  {
    slug: 'dev-demo-practice-golf-ball-6',
    name: '연습용 골프공 6구 세트',
    shortDescription: '연습장·라운드 모두 활용 가능한 6구 골프공 세트',
    coinPrice: '2500',
    stock: 40,
    categoryId: CATEGORY_GOLF,
    sortOrder: 5,
    exchangeGuide:
      '구매 후 MY > 구매내역에서 교환 코드를 확인할 수 있습니다. 직접 수령 또는 택배 배송 중 선택 가능합니다.',
    exchangeRefundGuide: '개봉 후 단순 변심 교환은 제한될 수 있습니다.',
    noticeGuide: '보관 시 직사광선과 고온 다습한 환경을 피해주세요.',
    images: {
      cover: 'golf-ball-cover.jpg',
      lifestyle: 'golf-ball-package.jpg',
      detail: 'golf-ball-detail.jpg',
      content1: 'golf-ball-content-1.jpg',
      content2: 'golf-ball-content-2.jpg',
      content3: 'golf-ball-content-3.jpg',
    },
    contentBlocks: [
      {
        type: MallContentBlockType.HEADING,
        text: '6구 세트 구성',
      },
      {
        type: MallContentBlockType.TEXT,
        text:
          '연습장에서 반복 타격에 적합한 내구성을 고려한 6구 세트입니다. 라운드 전 워밍업이나 스크린 연습에도 활용할 수 있습니다.',
      },
      { type: MallContentBlockType.IMAGE, file: 'golf-ball-content-1.jpg' },
      {
        type: MallContentBlockType.HEADING,
        text: '연습과 라운드 모두 OK',
      },
      {
        type: MallContentBlockType.TEXT,
        text:
          '일정한 비거리와 안정적인 스핀을 목표로 설계된 데모용 볼입니다. 초보자부터 동호회 라운드까지 무난하게 사용할 수 있습니다.',
      },
      { type: MallContentBlockType.IMAGE, file: 'golf-ball-content-2.jpg' },
      {
        type: MallContentBlockType.HEADING,
        text: '패키지와 보관',
      },
      {
        type: MallContentBlockType.TEXT,
        text:
          '재사용 가능한 메쉬 파우치에 6구가 담겨 있어 백 포켓이나 차량에 보관하기 편합니다. 사용하지 않은 볼은 파우치에 넣어 분실을 방지하세요.',
      },
      { type: MallContentBlockType.IMAGE, file: 'golf-ball-content-3.jpg' },
      {
        type: MallContentBlockType.NOTICE,
        text: '보관 시 직사광선과 고온 다습한 환경을 피해주세요.',
      },
    ],
  },
  {
    slug: 'dev-demo-home-putting-mat',
    name: '홈 퍼팅 연습 매트',
    shortDescription: '실내에서 거리 감각을 익히는 퍼팅 연습 매트',
    coinPrice: '3200',
    stock: 25,
    categoryId: CATEGORY_GOLF,
    sortOrder: 6,
    badge: '추천',
    exchangeGuide:
      '구매 후 MY > 구매내역에서 교환 코드를 확인할 수 있습니다. 택배 배송으로 수령할 수 있습니다.',
    exchangeRefundGuide: '단순 변심 교환은 제한될 수 있습니다.',
    noticeGuide: '바닥이 미끄러운 공간에서는 매트 하단 고정 패드를 확인해 주세요.',
    images: {
      cover: 'putting-mat-cover.jpg',
      lifestyle: 'putting-mat-lifestyle.jpg',
      detail: 'putting-mat-detail.jpg',
      content1: 'putting-mat-content-1.jpg',
      content2: 'putting-mat-content-2.jpg',
      content3: 'putting-mat-content-3.jpg',
    },
    contentBlocks: [
      {
        type: MallContentBlockType.HEADING,
        text: '실내 퍼팅 연습 매트',
      },
      {
        type: MallContentBlockType.TEXT,
        text:
          '거실·서재·사무실 등 평평한 바닥에서 퍼팅 스트로크를 반복 연습할 수 있습니다. 라운드 전 거리 감각을 유지하는 데 도움이 됩니다.',
      },
      { type: MallContentBlockType.IMAGE, file: 'putting-mat-content-1.jpg' },
      {
        type: MallContentBlockType.HEADING,
        text: '거리 표시 라인',
      },
      {
        type: MallContentBlockType.TEXT,
        text:
          '매트 표면에 거리 가이드 라인이 표시되어 1m·2m·3m 퍼팅 연습 시 스트로크 길이를 비교하기 쉽습니다.',
      },
      { type: MallContentBlockType.IMAGE, file: 'putting-mat-content-2.jpg' },
      {
        type: MallContentBlockType.HEADING,
        text: '접이식 수납과 연습 방법',
      },
      {
        type: MallContentBlockType.TEXT,
        text:
          '가볍게 말아 보관할 수 있는 구조로 차량 트렁크에 넣고 연습장 전 워밍업용으로도 활용할 수 있습니다. 홀컵 위치를 정한 뒤 짧은 거리부터 반복 연습해 보세요.',
      },
      { type: MallContentBlockType.IMAGE, file: 'putting-mat-content-3.jpg' },
      {
        type: MallContentBlockType.NOTICE,
        text: '바닥이 미끄러운 공간에서는 매트 하단 고정 패드를 확인해 주세요.',
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
    sortOrder: 7,
    exchangeGuide: '제휴 스크린골프 매장 내 카페/음료 코너에서 음료 1잔으로 교환할 수 있습니다.',
    usageGuide:
      '결제 시 쪼인존 앱 MY > 구매내역에서 쿠폰 바코드를 직원에게 제시해 주세요. 1인 1회 사용 가능합니다.',
    validityGuide: '구매일로부터 30일 이내 사용 가능합니다.',
    exchangeRefundGuide: '환불 및 재발급은 불가합니다.',
    noticeGuide:
      '타 쿠폰·프로모션과 중복 사용이 제한될 수 있으며, 유효기간 경과 후에는 사용할 수 없습니다.',
    images: {
      cover: 'drink-coupon-cover.jpg',
      lifestyle: 'drink-coupon-lounge.jpg',
      detail: 'drink-coupon-exchange.jpg',
      content1: 'drink-coupon-content-1.jpg',
      content2: 'drink-coupon-content-2.jpg',
      content3: 'drink-coupon-content-3.jpg',
    },
    contentBlocks: [
      {
        type: MallContentBlockType.HEADING,
        text: '라운드 후 가볍게 즐기는 음료 한 잔',
      },
      {
        type: MallContentBlockType.TEXT,
        text:
          '제휴 스크린골프 매장 내 카페/음료 코너에서 아메리카노, 에이드, 탄산음료 등 지정 메뉴 1잔으로 교환할 수 있습니다.',
      },
      { type: MallContentBlockType.IMAGE, file: 'drink-coupon-content-1.jpg' },
      {
        type: MallContentBlockType.HEADING,
        text: '사용 가능 장소',
      },
      {
        type: MallContentBlockType.TEXT,
        text:
          '쪼인존 제휴 스크린골프 라운지 전 매장에서 사용 가능합니다. 매장별 제공 메뉴는 상이할 수 있습니다.',
      },
      { type: MallContentBlockType.IMAGE, file: 'drink-coupon-content-2.jpg' },
      {
        type: MallContentBlockType.HEADING,
        text: '교환 방법과 유효기간',
      },
      {
        type: MallContentBlockType.TEXT,
        text:
          '결제 시 쪼인존 앱 MY > 구매내역에서 쿠폰 바코드를 직원에게 제시해 주세요. 구매일로부터 30일 이내 사용 가능하며, 1인 1회 사용입니다.',
      },
      { type: MallContentBlockType.IMAGE, file: 'drink-coupon-content-3.jpg' },
      {
        type: MallContentBlockType.NOTICE,
        text: '타 쿠폰·프로모션과 중복 사용이 제한될 수 있으며, 유효기간 경과 후에는 사용할 수 없습니다.',
      },
    ],
  },
  {
    slug: 'dev-demo-screen-practice-pass',
    name: '스크린골프 연습 이용권',
    shortDescription: '제휴 스크린골프 매장 1회 연습 이용권',
    coinPrice: '4800',
    stock: 20,
    categoryId: CATEGORY_OTHER,
    sortOrder: 8,
    badge: '추천',
    exchangeGuide:
      '제휴 스크린골프 매장에서 1회 연습 이용권으로 교환할 수 있습니다. 예약 시 구매내역을 제시해 주세요.',
    usageGuide:
      '쪼인존 앱 MY > 구매내역에서 이용권 바코드를 매장 직원에게 제시합니다. 1인 1회, 지정 시간대 내 이용 가능합니다.',
    validityGuide: '구매일로부터 60일 이내 사용 가능합니다.',
    exchangeRefundGuide: '환불 및 재발급은 불가합니다. 미사용 만료 시 자동 소멸됩니다.',
    noticeGuide:
      '매장별 예약 정책이 다를 수 있으며, 성수기에는 사전 예약이 필요할 수 있습니다.',
    images: {
      cover: 'screen-pass-cover.jpg',
      lifestyle: 'screen-pass-lounge.jpg',
      detail: 'screen-pass-booth.jpg',
      content1: 'screen-pass-content-1.jpg',
      content2: 'screen-pass-content-2.jpg',
      content3: 'screen-pass-content-3.jpg',
    },
    contentBlocks: [
      {
        type: MallContentBlockType.HEADING,
        text: '스크린골프 1회 연습 이용권',
      },
      {
        type: MallContentBlockType.TEXT,
        text:
          '제휴 스크린골프 매장에서 1회 연습 라운드를 이용할 수 있는 디지털 이용권입니다. 날씨와 관계없이 스윙 연습과 라운드 시뮬레이션을 즐길 수 있습니다.',
      },
      { type: MallContentBlockType.IMAGE, file: 'screen-pass-content-1.jpg' },
      {
        type: MallContentBlockType.HEADING,
        text: '사용 방법',
      },
      {
        type: MallContentBlockType.TEXT,
        text:
          '예약 또는 방문 시 쪼인존 앱 구매내역의 바코드를 직원에게 제시해 주세요. 매장 안내에 따라 부스 배정 후 이용을 시작합니다.',
      },
      { type: MallContentBlockType.IMAGE, file: 'screen-pass-content-2.jpg' },
      {
        type: MallContentBlockType.HEADING,
        text: '유효기간과 환불 정책',
      },
      {
        type: MallContentBlockType.TEXT,
        text:
          '구매일로부터 60일 이내 사용 가능합니다. 환불 및 재발급은 불가하며, 유효기간 경과 후 미사용 이용권은 자동 소멸됩니다.',
      },
      { type: MallContentBlockType.IMAGE, file: 'screen-pass-content-3.jpg' },
      {
        type: MallContentBlockType.NOTICE,
        text: '매장별 예약 정책이 다를 수 있으며, 성수기에는 사전 예약이 필요할 수 있습니다.',
      },
    ],
  },
];

export const MALL_DEMO_PRODUCTS: MallDemoProductSpec[] =
  MALL_DEMO_PRODUCT_DRAFTS.map(finalizeProduct);

export function resolveDemoAssetPath(fileName: string): string {
  return join(MALL_DEMO_ASSET_DIR, fileName);
}

export function listRequiredDemoAssetFiles(): string[] {
  const files = new Set<string>();
  for (const product of MALL_DEMO_PRODUCTS) {
    for (const file of listProductImageFiles(product.images)) files.add(file);
  }
  return [...files].sort();
}
