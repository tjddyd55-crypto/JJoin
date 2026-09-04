import type { JoinCardProps } from '@jjoin/design-system';

/** Static fixtures for join Figma QA preview — no network. */
export const JOIN_FIGMA_QA_CARD: JoinCardProps = {
  variant: 'default',
  title: '오늘 저녁 초보 환영',
  venueName: '거제 오션스크린',
  venueSubLabel: '고현동 · 2.4km',
  scheduleLabel: '09.17(목) · 오후 7:40',
  countLabel: '2/4명',
  seatsHighlight: '2자리 남음',
  seatsHighlightTone: 'available',
  ddayLabel: 'D-3',
  statusBadges: [{ label: '모집 중', tone: 'open' }],
  hostNickname: '성용골퍼',
  hostAvatarUrl: null,
  reasonTags: ['내 주변', '비슷한 실력'],
};

export const JOIN_FIGMA_QA_CARD_SECOND: JoinCardProps = {
  ...JOIN_FIGMA_QA_CARD,
  title: '퇴근 후 즐거운 스크린 한 게임',
  venueName: '프렌즈스크린 거제점',
  venueSubLabel: '1.2km',
  scheduleLabel: '내일 · 오후 7:00',
  countLabel: '3/4명',
  seatsHighlight: '1자리 남음',
  seatsHighlightTone: 'lastSeat',
  ddayLabel: 'D-1',
  statusBadges: [{ label: '마감 임박', tone: 'urgent' }],
  reasonTags: ['긴급 모집', '함께 친 방장'],
};

export const JOIN_FIGMA_QA_CARD_COMPACT: JoinCardProps = {
  ...JOIN_FIGMA_QA_CARD,
  variant: 'compact',
  reasonTags: ['추천'],
};

export const JOIN_FIGMA_QA_CARD_MANAGEMENT: JoinCardProps = {
  ...JOIN_FIGMA_QA_CARD,
  variant: 'management',
  statusBadges: [{ label: '모집 중', tone: 'open' }],
  rewardLabel: null,
};

export const JOIN_FIGMA_QA_WEEK_ANCHOR = '2026-09-14';
export const JOIN_FIGMA_QA_SELECTED_DATE = '2026-09-17';

export const JOIN_FIGMA_WIDTHS = [360, 390, 430] as const;
export type JoinFigmaQaWidth = (typeof JOIN_FIGMA_WIDTHS)[number];

export type JoinFigmaQaScene =
  | 'join-list'
  | 'join-detail'
  | 'my-joins'
  | 'home-join-card';

export function parseJoinFigmaQaWidth(raw: string | string[] | undefined): JoinFigmaQaWidth {
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  if (n === 360 || n === 430) return n;
  return 390;
}

export function parseJoinFigmaQaScene(raw: string | string[] | undefined): JoinFigmaQaScene {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === 'join-detail' || value === 'my-joins' || value === 'home-join-card') {
    return value;
  }
  return 'join-list';
}
