export type ClubFigmaQaScene =
  | 'discover'
  | 'detail'
  | 'my-clubs'
  | 'search'
  | 'fallback'
  | 'join-cta';

export const CLUB_FIGMA_QA_WIDTHS = [360, 390, 430] as const;

export function parseClubFigmaQaWidth(raw?: string): number {
  const n = Number(raw);
  if (CLUB_FIGMA_QA_WIDTHS.includes(n as 360 | 390 | 430)) return n;
  return 390;
}

export function parseClubFigmaQaScene(raw?: string): ClubFigmaQaScene {
  const scenes: ClubFigmaQaScene[] = [
    'discover',
    'detail',
    'my-clubs',
    'search',
    'fallback',
    'join-cta',
  ];
  if (raw && scenes.includes(raw as ClubFigmaQaScene)) return raw as ClubFigmaQaScene;
  return 'discover';
}

export const CLUB_FIGMA_QA_CARD_WITH_COVER = {
  name: '[QA-CLUB] 일산 스크린 골프 동호회',
  intro: '주 2회 스크린 라운드, 초보·중급 환영합니다.',
  metaLine: '스크린 · 경기 고양 · 회원 24명',
  activityLine: '최근 30일 모임 3회',
  coverImageUrl: 'https://picsum.photos/seed/club-bright-cover/400/400',
  fallbackTone: 'green' as const,
  statusLabel: null,
};

export const CLUB_FIGMA_QA_CARD_LONG = {
  name: '[QA-CLUB] 거제 오션뷰 필드 골프클럽 프리미엄 정기 모임',
  intro:
    '필드 라운드와 스크린 연습을 병행하는 정기 모임입니다. 매너와 즐거움을 함께 지키며 장기적으로 함께할 분을 찾습니다.',
  metaLine: '필드 · 경남 거제 · 경남 통영 · 회원 18명',
  activityLine: '최근 30일 모임 5회',
  coverImageUrl: 'https://picsum.photos/seed/club-bright-long/400/400',
  fallbackTone: 'blue' as const,
  statusLabel: '가입 대기',
  statusTone: 'pending' as const,
};

export const CLUB_FIGMA_QA_CARD_FALLBACK = {
  name: '[QA-CLUB] 커버 없음 동호회',
  intro: '대표 이미지 없이 기본 커버 fallback을 확인합니다.',
  metaLine: '스크린+필드 · 서울 강남 · 회원 12명',
  activityLine: '최근 30일 모임 1회',
  coverImageUrl: null,
  fallbackTone: 'green' as const,
  statusLabel: null,
};

export const CLUB_FIGMA_QA_MY_CLUB = {
  name: '[QA-CLUB] 내가 운영하는 동호회',
  intro: '운영자 상태 카드',
  metaLine: '스크린 · 경기 일산 · 회원 8명',
  activityLine: '최근 30일 모임 2회',
  coverImageUrl: 'https://picsum.photos/seed/club-bright-mine/400/400',
  fallbackTone: 'blue' as const,
  statusLabel: '운영 중',
  statusTone: 'active' as const,
};
