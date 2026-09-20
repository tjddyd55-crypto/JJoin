/**
 * Notification title/body SSOT. Feature handlers pass context, not raw copy.
 */

export type NotificationContentContext = {
  actorNickname?: string | null;
  venueName?: string | null;
  clubName?: string | null;
  messagePreview?: string | null;
  joinTitle?: string | null;
  rewardAmount?: string | null;
  achievementKind?: string | null;
  milestoneThreshold?: number | null;
  currentStreak?: number | null;
};

export type NotificationContent = {
  title: string;
  body: string;
};

const COPY: Record<string, (ctx: NotificationContentContext) => NotificationContent> = {
  JOIN_CREATED: (ctx) => ({
    title: '근처 새 조인',
    body: `${label(ctx.venueName, '매장')}에 새 조인이 열렸습니다.`,
  }),
  DIRECT_MESSAGE_RECEIVED: (ctx) => ({
    title: '새 메시지',
    body: `${label(ctx.actorNickname, '상대')}: ${label(ctx.messagePreview, '메시지가 도착했습니다.')}`,
  }),
  FRIEND_REQUEST_RECEIVED: (ctx) => ({
    title: '골프친구 요청',
    body: `${label(ctx.actorNickname, '상대')}님이 골프친구를 요청했습니다.`,
  }),
  FRIEND_REQUEST_ACCEPTED: (ctx) => ({
    title: '골프친구 수락',
    body: `${label(ctx.actorNickname, '상대')}님이 골프친구 요청을 수락했습니다.`,
  }),
  JOIN_APPLICATION_RECEIVED: (ctx) => ({
    title: '새 참가 신청',
    body: `${label(ctx.actorNickname, '참가자')}님이 조인 참가를 신청했습니다.`,
  }),
  JOIN_APPLICATION_APPROVED: () => ({
    title: '참가 승인',
    body: '참가 신청이 승인되었습니다.',
  }),
  JOIN_APPLICATION_REJECTED: (ctx) => ({
    title: '참가 거절',
    body: `${label(ctx.venueName, '조인')} 참가 신청이 거절되었습니다.`,
  }),
  JOIN_UPDATED: (ctx) => ({
    title: '조인 정보 변경',
    body: `${label(ctx.venueName, '조인')} 정보가 변경되었습니다.`,
  }),
  JOIN_CANCELLED: (ctx) => ({
    title: '조인 취소',
    body: `${label(ctx.venueName, '조인')}이 취소되었습니다.`,
  }),
  REWARD_PAID: (ctx) => ({
    title: '리워드 지급',
    body: ctx.rewardAmount
      ? `${ctx.rewardAmount} 리워드가 지급되었습니다.`
      : '리워드가 지급되었습니다.',
  }),
  REWARD_AUTO_PAID: (ctx) => ({
    title: '리워드 자동 지급',
    body: ctx.rewardAmount
      ? `${ctx.rewardAmount} 리워드가 자동 지급되었습니다.`
      : '리워드가 자동 지급되었습니다.',
  }),
  CLUB_JOIN_REQUESTED: (ctx) => ({
    title: '동호회 가입 신청',
    body: `${label(ctx.clubName, '동호회')}에 새 가입 신청이 있습니다.`,
  }),
  CLUB_JOIN_APPROVED: (ctx) => ({
    title: '동호회 가입 승인',
    body: `${label(ctx.clubName, '동호회')} 가입이 승인되었습니다.`,
  }),
  CLUB_JOIN_REJECTED: (ctx) => ({
    title: '동호회 가입 거절',
    body: `${label(ctx.clubName, '동호회')} 가입 신청이 거절되었습니다.`,
  }),
  JOIN_ALERT_MATCH: (ctx) => ({
    title: '조건에 맞는 조인',
    body: `${label(ctx.venueName, '매장')}에 참가 가능한 조인이 열렸습니다.`,
  }),
  FOLLOWED_STORE_NEW_JOIN: (ctx) => ({
    title: '관심 매장 새 조인',
    body: `${label(ctx.venueName, '매장')}에 새 조인이 등록되었습니다.`,
  }),
  ATTENDANCE_REWARD: (ctx) => ({
    title: '오늘 출석 완료',
    body: ctx.rewardAmount
      ? `${ctx.rewardAmount}코인 지급 · 연속 ${Math.max(1, ctx.currentStreak ?? 1)}일`
      : '오늘 앱 출석이 기록되었습니다.',
  }),
  ACHIEVEMENT_REWARD: (ctx) => ({
    title: ctx.achievementKind === 'PARTICIPATION_MILESTONE' ? '참가 업적 달성' : '호스트 업적 달성',
    body: ctx.rewardAmount
      ? `${ctx.milestoneThreshold ?? ''}회 성사 · ${ctx.rewardAmount}코인 지급`
      : '성사 업적 보상이 지급되었습니다.',
  }),
};

function label(value: string | null | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

export function buildNotificationContent(
  type: string,
  ctx: NotificationContentContext = {},
): NotificationContent {
  const builder = COPY[type];
  if (builder) return builder(ctx);
  return {
    title: '알림',
    body: ctx.joinTitle?.trim() || ctx.venueName?.trim() || '새로운 알림이 있습니다.',
  };
}
