/**
 * Investor/demo catalog SSOT.
 * All rows created by the seed are tagged so reset never touches DEV QA personas.
 *
 * Images: generated DiceBear avatars (illustrated, not real people) +
 * Pexels landscape/venue stock reused from the mall demo source list.
 */

import { INVESTOR_DEMO_TAG } from './investor-demo-guard.ts';

export const DEMO_SUBJECT_PREFIX = 'investor-demo-';
export const DEMO_EMAIL_DOMAIN = 'jjoin.zone.demo';
export const DEMO_JOIN_TITLE_PREFIX = `${INVESTOR_DEMO_TAG} `;
export const DEMO_FACILITY_KEY_PREFIX = 'investor-demo-facility-';
export const DEMO_COURSE_EXTERNAL_PREFIX = 'investor-demo-course-';
export const DEMO_VENUE_PLACE_PREFIX = 'investor-demo-venue-';
export const DEMO_CLUB_NAME_PREFIX = `${INVESTOR_DEMO_TAG} `;
export const DEMO_BANNER_TITLE_PREFIX = `${INVESTOR_DEMO_TAG} `;
export const DEMO_DM_KEY_PREFIX = 'investor-demo-dm:';

/** Physical-device / mock-auth QA accounts — never seed or delete these. */
export const PROTECTED_PROVIDER_SUBJECTS = [
  'dev-persona-a',
  'dev-persona-b',
  'dev-persona-c',
  'dev-persona-admin',
  'dev-persona-billing-low',
  'dev-persona-billing-retry',
] as const;

export const PROTECTED_NICKNAME_MARKERS = [
  '김진우_DEV_A',
  '박민수_DEV_B',
  '이서연_DEV_C',
  '운영관리자_DEV_ADMIN',
  '빌링저액',
  '빌링재시도',
  'QAUser',
  'DevE2E',
] as const;

export type DemoPersonaSlug =
  | 'hajun'
  | 'seoa'
  | 'doyun'
  | 'yerin'
  | 'minjae'
  | 'jihu'
  | 'haneul'
  | 'taehyun';

export type DemoPersonaSpec = {
  slug: DemoPersonaSlug;
  nickname: string;
  gender: 'MALE' | 'FEMALE';
  ageBand: 'TWENTIES' | 'THIRTIES' | 'FORTIES';
  age: number;
  heightCm: number;
  regionLabel: string;
  regionCode: string;
  bio: string;
  skillLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  screenHandicap: number;
  fieldHandicap: number;
  attendanceDays: number;
  includeTodayAttendance: boolean;
  hostCompleted: number;
  participateCompleted: number;
  role: 'host' | 'player' | 'owner' | 'club';
};

export const DEMO_PERSONAS: DemoPersonaSpec[] = [
  {
    slug: 'hajun',
    nickname: '정하준·데모',
    gender: 'MALE',
    ageBand: 'THIRTIES',
    age: 34,
    heightCm: 178,
    regionLabel: '서울 강남',
    regionCode: '11680',
    bio: '강남 스크린 주말 번개 호스트. 투자자 데모 계정입니다.',
    skillLevel: 'ADVANCED',
    screenHandicap: 4,
    fieldHandicap: 8,
    attendanceDays: 12,
    includeTodayAttendance: true,
    hostCompleted: 5,
    participateCompleted: 1,
    role: 'host',
  },
  {
    slug: 'seoa',
    nickname: '윤서아·데모',
    gender: 'FEMALE',
    ageBand: 'TWENTIES',
    age: 27,
    heightCm: 165,
    regionLabel: '경기 성남',
    regionCode: '41135',
    bio: '필드·스크린 가리지 않는 참가 중심 플레이어.',
    skillLevel: 'INTERMEDIATE',
    screenHandicap: 12,
    fieldHandicap: 18,
    attendanceDays: 7,
    includeTodayAttendance: true,
    hostCompleted: 0,
    participateCompleted: 5,
    role: 'player',
  },
  {
    slug: 'doyun',
    nickname: '한도윤·데모',
    gender: 'MALE',
    ageBand: 'FORTIES',
    age: 41,
    heightCm: 176,
    regionLabel: '경기 수원',
    regionCode: '41111',
    bio: '스크린 매장 운영. 저녁 타임 매칭을 자주 엽니다.',
    skillLevel: 'INTERMEDIATE',
    screenHandicap: 10,
    fieldHandicap: 14,
    attendanceDays: 5,
    includeTodayAttendance: true,
    hostCompleted: 1,
    participateCompleted: 0,
    role: 'owner',
  },
  {
    slug: 'yerin',
    nickname: '최예린·데모',
    gender: 'FEMALE',
    ageBand: 'TWENTIES',
    age: 24,
    heightCm: 162,
    regionLabel: '서울 마포',
    regionCode: '11440',
    bio: '입문 두 달 차. 친한 분위기 조인을 좋아합니다.',
    skillLevel: 'BEGINNER',
    screenHandicap: 28,
    fieldHandicap: 36,
    attendanceDays: 3,
    includeTodayAttendance: true,
    hostCompleted: 0,
    participateCompleted: 2,
    role: 'player',
  },
  {
    slug: 'minjae',
    nickname: '강민재·데모',
    gender: 'MALE',
    ageBand: 'THIRTIES',
    age: 36,
    heightCm: 181,
    regionLabel: '서울 송파',
    regionCode: '11710',
    bio: '주말 클럽 라운드 총무. 일정 조율을 맡습니다.',
    skillLevel: 'ADVANCED',
    screenHandicap: 6,
    fieldHandicap: 9,
    attendanceDays: 9,
    includeTodayAttendance: false,
    hostCompleted: 1,
    participateCompleted: 2,
    role: 'club',
  },
  {
    slug: 'jihu',
    nickname: '배지후·데모',
    gender: 'MALE',
    ageBand: 'THIRTIES',
    age: 31,
    heightCm: 174,
    regionLabel: '인천 연수',
    regionCode: '28185',
    bio: '평일 퇴근 후 스크린 한 게임.',
    skillLevel: 'INTERMEDIATE',
    screenHandicap: 14,
    fieldHandicap: 20,
    attendanceDays: 4,
    includeTodayAttendance: true,
    hostCompleted: 0,
    participateCompleted: 2,
    role: 'player',
  },
  {
    slug: 'haneul',
    nickname: '오하늘·데모',
    gender: 'FEMALE',
    ageBand: 'TWENTIES',
    age: 29,
    heightCm: 168,
    regionLabel: '부산 해운대',
    regionCode: '26350',
    bio: '필드 바다 코스를 좋아합니다.',
    skillLevel: 'INTERMEDIATE',
    screenHandicap: 16,
    fieldHandicap: 22,
    attendanceDays: 6,
    includeTodayAttendance: true,
    hostCompleted: 0,
    participateCompleted: 3,
    role: 'player',
  },
  {
    slug: 'taehyun',
    nickname: '임태현·데모',
    gender: 'MALE',
    ageBand: 'FORTIES',
    age: 44,
    heightCm: 177,
    regionLabel: '경기 용인',
    regionCode: '41461',
    bio: '주말 필드 호스트. 그린피 정산은 명확하게.',
    skillLevel: 'ADVANCED',
    screenHandicap: 5,
    fieldHandicap: 7,
    attendanceDays: 8,
    includeTodayAttendance: true,
    hostCompleted: 5,
    participateCompleted: 0,
    role: 'host',
  },
];

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
  coverPexelsId: number;
};

/** Names/vibe align with ensure-dev-major-feature-expansion, but tagged for reset. */
export const DEMO_STORES: DemoStoreSpec[] = [
  {
    slug: 'gangnam',
    name: '강남 스크린 라운지',
    sido: '서울특별시',
    sigungu: '강남구',
    brand: 'GOLFZON',
    intro: '야간 라운딩 맛집 · 주차·샤워 완비',
    vibe: '밝고 편한 분위기',
    lat: 37.4979,
    lng: 127.0276,
    ownerSlug: 'doyun',
    coverPexelsId: 3660204,
  },
  {
    slug: 'bundang',
    name: '분당 카카오VX 스튜디오',
    sido: '경기도',
    sigungu: '성남시',
    brand: 'KAKAO_VX',
    intro: '조용한 연습 공간 · 1인 부킹 가능',
    vibe: '차분한 연습실',
    lat: 37.3595,
    lng: 127.105,
    ownerSlug: 'doyun',
    coverPexelsId: 6573702,
  },
  {
    slug: 'suwon',
    name: '수원 SG 파크',
    sido: '경기도',
    sigungu: '수원시',
    brand: 'SG_GOLF',
    intro: '가족 라운드 추천 · 주말 오전 오픈',
    vibe: '가족 친화',
    lat: 37.2636,
    lng: 127.0286,
    ownerSlug: 'doyun',
    coverPexelsId: 2624380,
  },
  {
    slug: 'mapo',
    name: '마포 미드나잇 스크린',
    sido: '서울특별시',
    sigungu: '마포구',
    brand: 'OTHER',
    brandOther: '자체 시뮬레이터',
    intro: '심야 오픈 · 퇴근 후 한 게임',
    vibe: '심야 라운지',
    lat: 37.556,
    lng: 126.923,
    ownerSlug: 'doyun',
    coverPexelsId: 3660205,
  },
];

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
];

export type DemoBannerSpec = {
  slug: string;
  title: string;
  subtitle: string;
  href: string;
  sortOrder: number;
  pexelsId: number;
};

export const DEMO_BANNERS: DemoBannerSpec[] = [
  {
    slug: 'field-weekend',
    title: '주말 필드 조인, 지금 모집 중',
    subtitle: '용인·이천 실코스에서 4인 스퀘어',
    href: '/(tabs)/joins',
    sortOrder: 1,
    pexelsId: 114296,
  },
  {
    slug: 'screen-tonight',
    title: '강남 스크린에서 오늘 저녁 한 게임',
    subtitle: '검증된 매장 · 바로 참여 가능',
    href: '/stores',
    sortOrder: 2,
    pexelsId: 3660204,
  },
  {
    slug: 'attendance',
    title: '출석하고 코인 받기',
    subtitle: '하루 한 번 · 연속 출석 보상',
    href: '/my/rewards',
    sortOrder: 3,
    pexelsId: 6230159,
  },
];

export const DEMO_CLUB = {
  slug: 'weekend-square',
  name: '주말스퀘어 클럽',
  intro: '주말 필드 + 평일 스크린. 투자자 데모용 공개 클럽입니다.',
  region: '서울특별시 강남구',
  ownerSlug: 'minjae' as DemoPersonaSlug,
  memberSlugs: ['hajun', 'seoa', 'haneul'] as DemoPersonaSlug[],
};

export function demoEmail(slug: DemoPersonaSlug): string {
  return `investor-demo+${slug}@${DEMO_EMAIL_DOMAIN}`;
}

export function demoProviderSubject(slug: DemoPersonaSlug): string {
  return `${DEMO_SUBJECT_PREFIX}${slug}`;
}

export function demoAvatarUrl(slug: DemoPersonaSlug): string {
  const seed = encodeURIComponent(`jjoin-investor-demo-${slug}`);
  return `https://api.dicebear.com/9.x/notionists/png?seed=${seed}&backgroundColor=d1d4f9,c0aede,b6e3f4`;
}

export function demoGalleryUrl(slug: DemoPersonaSlug, index: number): string {
  const seed = encodeURIComponent(`jjoin-investor-demo-${slug}-g${index}`);
  return `https://api.dicebear.com/9.x/shapes/png?seed=${seed}&backgroundColor=e0f2fe`;
}

export function pexelsImageUrl(photoId: number, width = 1400): string {
  return `https://images.pexels.com/photos/${photoId}/pexels-photo-${photoId}.jpeg?auto=compress&cs=tinysrgb&w=${width}`;
}

export function demoBannerTitle(spec: DemoBannerSpec): string {
  return `${DEMO_BANNER_TITLE_PREFIX}${spec.title}`;
}

export function demoClubName(): string {
  return `${DEMO_CLUB_NAME_PREFIX}${DEMO_CLUB.name}`;
}

export function isProtectedProviderSubject(subject: string): boolean {
  return PROTECTED_PROVIDER_SUBJECTS.includes(subject as (typeof PROTECTED_PROVIDER_SUBJECTS)[number]);
}

export function isProtectedNickname(nickname: string): boolean {
  return PROTECTED_NICKNAME_MARKERS.some((marker) => nickname.includes(marker));
}

export function isDemoEmail(email: string | null | undefined): boolean {
  return Boolean(email && email.toLowerCase().endsWith(`@${DEMO_EMAIL_DOMAIN}`));
}

export function isDemoProviderSubject(subject: string): boolean {
  return subject.startsWith(DEMO_SUBJECT_PREFIX);
}
