import { assertSafeUiCopy, pickFromPool, SCREEN_STORE_INTROS, SCREEN_STORE_VIBES } from './investor-demo-copy.ts';
import type { DemoPersonaSlug } from './investor-demo-personas.ts';

export type DemoStoreSpec = {
  slug: string;
  name: string;
  sido: string;
  sigungu: string;
  brand: 'GOLFZON' | 'KAKAO_VX' | 'SG_GOLF' | 'OTHER';
  brandOther?: string;
  intro: string;
  vibe: string;
  lat: number;
  lng: number;
  ownerSlug: DemoPersonaSlug;
  galleryCount: number;
};

export const DEMO_STORES: DemoStoreSpec[] = [
  store('gangnam', '강남 스크린 라운지', '서울특별시', '강남구', 'GOLFZON', 37.4979, 127.0276, 'doyun', 4),
  store('bundang', '분당 스크린 스튜디오', '경기도', '성남시', 'KAKAO_VX', 37.3595, 127.105, 'doyun', 3),
  store('suwon', '수원 인계 파크', '경기도', '수원시', 'SG_GOLF', 37.2636, 127.0286, 'doyun', 1),
  store('mapo', '마포 저녁 스크린', '서울특별시', '마포구', 'OTHER', 37.556, 126.923, 'doyun', 1, '자체 시뮬레이터'),
  store('ilsan', '일산 호수 스크린', '경기도', '고양시', 'GOLFZON', 37.658, 126.768, 'dohyun', 1),
  store('paju', '파주 운정 스크린', '경기도', '파주시', 'KAKAO_VX', 37.728, 126.767, 'sua', 1),
  store('gimpo', '김포 구래 스크린', '경기도', '김포시', 'SG_GOLF', 37.645, 126.646, 'woojin', 1),
  store('songdo', '송도 센트럴 스크린', '인천광역시', '연수구', 'GOLFZON', 37.392, 126.639, 'jihu', 3),
  store('bucheon', '부천 중동 스크린', '경기도', '부천시', 'OTHER', 37.503, 126.766, 'subin', 1, '트랙맨'),
  store('gwangmyeong', '광명 철산 스크린', '경기도', '광명시', 'GOLFZON', 37.475, 126.868, 'seongmin', 1),
  store('anyang', '안양 평촌 스크린', '경기도', '안양시', 'KAKAO_VX', 37.390, 126.951, 'chaewon', 1),
  store('yongin', '용인 수지 스크린', '경기도', '용인시', 'SG_GOLF', 37.322, 127.098, 'junhyuk', 1),
  store('hwaseong', '화성 동탄 스크린', '경기도', '화성시', 'GOLFZON', 37.200, 127.072, 'seongmin', 1),
  store('namyangju', '남양주 다산 스크린', '경기도', '남양주시', 'OTHER', 37.608, 127.171, 'taeyang', 1, '자체 시뮬레이터'),
  store('uijeongbu', '의정부 민락 스크린', '경기도', '의정부시', 'GOLFZON', 37.745, 127.11, 'eunseo', 1),
  store('songpa', '송파 잠실 스크린', '서울특별시', '송파구', 'KAKAO_VX', 37.513, 127.102, 'minjae', 2),
  store('haeundae', '해운대 마린 스크린', '부산광역시', '해운대구', 'GOLFZON', 35.163, 129.163, 'haneul', 3),
  store('suseong', '대구 수성 스크린', '대구광역시', '수성구', 'SG_GOLF', 35.858, 128.63, 'seohyun', 1),
  store('dunsan', '대전 둔산 스크린', '대전광역시', '서구', 'GOLFZON', 36.351, 127.378, 'yujin', 1),
  store('sangmu', '광주 상무 스크린', '광주광역시', '서구', 'KAKAO_VX', 35.152, 126.851, 'seongmin', 1),
];

function store(
  slug: string,
  name: string,
  sido: string,
  sigungu: string,
  brand: DemoStoreSpec['brand'],
  lat: number,
  lng: number,
  ownerSlug: DemoPersonaSlug,
  galleryCount: number,
  brandOther?: string,
): DemoStoreSpec {
  return {
    slug,
    name,
    sido,
    sigungu,
    brand,
    brandOther,
    intro: pickFromPool(SCREEN_STORE_INTROS, `store-intro:${slug}`),
    vibe: pickFromPool(SCREEN_STORE_VIBES, `store-vibe:${slug}`),
    lat,
    lng,
    ownerSlug,
    galleryCount,
  };
}

export type DemoCourseFallback = {
  slug: string;
  name: string;
  sido: string;
  sigungu: string;
  address: string;
  lat: number;
  lng: number;
  holeCount: number;
};

export const DEMO_FIELD_COURSE_FALLBACKS: DemoCourseFallback[] = [
  {
    slug: 'yongin-south',
    name: '용인 남서울 컨트리클럽',
    sido: '경기도',
    sigungu: '용인시',
    address: '경기도 용인시 처인구',
    lat: 37.241,
    lng: 127.177,
    holeCount: 18,
  },
  {
    slug: 'icheon-lake',
    name: '이천 레이크사이드 컨트리클럽',
    sido: '경기도',
    sigungu: '이천시',
    address: '경기도 이천시',
    lat: 37.272,
    lng: 127.435,
    holeCount: 18,
  },
  {
    slug: 'incheon-sky',
    name: '인천 스카이72 오션',
    sido: '인천광역시',
    sigungu: '중구',
    address: '인천광역시 중구 운서동',
    lat: 37.469,
    lng: 126.466,
    holeCount: 18,
  },
  {
    slug: 'gapyeong-pine',
    name: '가평 파인리즈 컨트리클럽',
    sido: '경기도',
    sigungu: '가평군',
    address: '경기도 가평군',
    lat: 37.831,
    lng: 127.51,
    holeCount: 18,
  },
  {
    slug: 'chuncheon-lake',
    name: '춘천 호반 컨트리클럽',
    sido: '강원특별자치도',
    sigungu: '춘천시',
    address: '강원특별자치도 춘천시',
    lat: 37.881,
    lng: 127.73,
    holeCount: 18,
  },
  {
    slug: 'cheongju-west',
    name: '청주 서부 컨트리클럽',
    sido: '충청북도',
    sigungu: '청주시',
    address: '충청북도 청주시',
    lat: 36.642,
    lng: 127.489,
    holeCount: 18,
  },
  {
    slug: 'cheonan-valley',
    name: '천안 밸리 컨트리클럽',
    sido: '충청남도',
    sigungu: '천안시',
    address: '충청남도 천안시',
    lat: 36.815,
    lng: 127.113,
    holeCount: 18,
  },
  {
    slug: 'gyeongju-east',
    name: '경주 동해 컨트리클럽',
    sido: '경상북도',
    sigungu: '경주시',
    address: '경상북도 경주시',
    lat: 35.856,
    lng: 129.225,
    holeCount: 18,
  },
  {
    slug: 'gimhae-south',
    name: '김해 남부 컨트리클럽',
    sido: '경상남도',
    sigungu: '김해시',
    address: '경상남도 김해시',
    lat: 35.228,
    lng: 128.889,
    holeCount: 18,
  },
  {
    slug: 'jeonju-hill',
    name: '전주 힐 컨트리클럽',
    sido: '전북특별자치도',
    sigungu: '전주시',
    address: '전북특별자치도 전주시',
    lat: 35.824,
    lng: 127.148,
    holeCount: 18,
  },
  {
    slug: 'suncheon-bay',
    name: '순천만 컨트리클럽',
    sido: '전라남도',
    sigungu: '순천시',
    address: '전라남도 순천시',
    lat: 34.95,
    lng: 127.487,
    holeCount: 18,
  },
  {
    slug: 'jeju-west',
    name: '제주 서부 컨트리클럽',
    sido: '제주특별자치도',
    sigungu: '제주시',
    address: '제주특별자치도 제주시',
    lat: 33.45,
    lng: 126.35,
    holeCount: 18,
  },
];

export type DemoBannerSpec = {
  slug: string;
  title: string;
  subtitle: string;
  href: string;
  sortOrder: number;
};

export const DEMO_BANNERS: DemoBannerSpec[] = [
  {
    slug: 'field-weekend',
    title: '주말 필드 조인, 지금 모집 중',
    subtitle: '용인·이천·인천 실코스에서 자리 남았습니다',
    href: '/(tabs)/joins',
    sortOrder: 1,
  },
  {
    slug: 'screen-tonight',
    title: '오늘 저녁 스크린 한 게임',
    subtitle: '수도권 매장에서 바로 참여할 수 있어요',
    href: '/stores',
    sortOrder: 2,
  },
  {
    slug: 'attendance',
    title: '출석하고 코인 받기',
    subtitle: '하루 한 번 · 연속 출석 보상',
    href: '/my/rewards',
    sortOrder: 3,
  },
  {
    slug: 'stores-capital',
    title: '가까운 스크린 매장 둘러보기',
    subtitle: '강남·분당·송도·동탄 공개 프로필',
    href: '/stores',
    sortOrder: 4,
  },
  {
    slug: 'tee-this-week',
    title: '이번 주 티오프 자리 있어요',
    subtitle: '새벽부터 오후까지 시간대가 섞여 있습니다',
    href: '/(tabs)/joins',
    sortOrder: 5,
  },
];

export type DemoClubSpec = {
  slug: string;
  name: string;
  intro: string;
  region: string;
  ownerSlug: DemoPersonaSlug;
  memberSlugs: DemoPersonaSlug[];
  inviteCode: string;
  coverAsset: 'field' | 'screen' | 'clubhouse';
};

export const DEMO_CLUBS: DemoClubSpec[] = [
  {
    slug: 'weekend-square',
    name: '주말스퀘어 클럽',
    intro: '주말 필드와 평일 스크린을 같이 맞추는 공개 클럽입니다.',
    region: '서울특별시 강남구',
    ownerSlug: 'minjae',
    memberSlugs: ['hajun', 'seoa', 'haneul', 'taehyun'],
    inviteCode: 'invdemo-weekend',
    coverAsset: 'field',
  },
  {
    slug: 'gangnam-evening',
    name: '강남저녁라운드',
    intro: '퇴근 후 스크린을 자주 여는 저녁 모임입니다.',
    region: '서울특별시 강남구',
    ownerSlug: 'hajun',
    memberSlugs: ['yerin', 'jiho', 'daeun', 'harin'],
    inviteCode: 'invdemo-v2-gangnam-evening',
    coverAsset: 'screen',
  },
  {
    slug: 'capital-field',
    name: '수도권필드모임',
    intro: '수도권 실코스 부킹을 함께 잡습니다.',
    region: '경기도 용인시',
    ownerSlug: 'taehyun',
    memberSlugs: ['seungho', 'jaewon', 'minjae', 'sua'],
    inviteCode: 'invdemo-v2-capital-field',
    coverAsset: 'field',
  },
  {
    slug: 'weekday-screen',
    name: '평일스크린모임',
    intro: '초중급 위주로 천천히 치는 공개 모임입니다.',
    region: '경기도 성남시',
    ownerSlug: 'dohyun',
    memberSlugs: ['soyun', 'subin', 'siwoo', 'jimin'],
    inviteCode: 'invdemo-v2-weekday-screen',
    coverAsset: 'screen',
  },
  {
    slug: 'weekend-booking',
    name: '주말부킹클럽',
    intro: '주말 오전 티오프를 고정으로 잡습니다.',
    region: '충청남도 천안시',
    ownerSlug: 'seungho',
    memberSlugs: ['yujin', 'yewon', 'chaewon', 'seohyun'],
    inviteCode: 'invdemo-v2-weekend-booking',
    coverAsset: 'clubhouse',
  },
];

/** Backward-compatible single-club export used by older seed helpers. */
export const DEMO_CLUB = DEMO_CLUBS[0]!;

export function demoClubInviteCodes(): string[] {
  return DEMO_CLUBS.map((row) => row.inviteCode);
}

export function demoBannerTitles(): string[] {
  return DEMO_BANNERS.map((row) => row.title);
}

export function demoClubNames(): string[] {
  return DEMO_CLUBS.map((row) => row.name);
}

export function validateVenueCatalog(): void {
  const storeSlugs = new Set<string>();
  for (const row of DEMO_STORES) {
    if (storeSlugs.has(row.slug)) throw new Error(`duplicate_store ${row.slug}`);
    storeSlugs.add(row.slug);
    assertSafeUiCopy(row.name, `store.${row.slug}.name`);
    assertSafeUiCopy(row.intro, `store.${row.slug}.intro`);
    assertSafeUiCopy(row.vibe, `store.${row.slug}.vibe`);
  }
  for (const row of DEMO_FIELD_COURSE_FALLBACKS) {
    assertSafeUiCopy(row.name, `course.${row.slug}.name`);
  }
  for (const row of DEMO_BANNERS) {
    assertSafeUiCopy(row.title, `banner.${row.slug}.title`);
    assertSafeUiCopy(row.subtitle, `banner.${row.slug}.subtitle`);
  }
  const clubSlugs = new Set<string>();
  for (const row of DEMO_CLUBS) {
    if (clubSlugs.has(row.slug)) throw new Error(`duplicate_club ${row.slug}`);
    clubSlugs.add(row.slug);
    assertSafeUiCopy(row.name, `club.${row.slug}.name`);
    assertSafeUiCopy(row.intro, `club.${row.slug}.intro`);
  }
}
