/**
 * Rule-based join recommendations — no ML. Scores are internal only.
 */

export type RecommendReasonCode =
  | 'FOLLOWED_STORE'
  | 'PAST_VENUE'
  | 'SAME_REGION'
  | 'PLAYED_TOGETHER'
  | 'PREFERRED_TIME'
  | 'URGENT'
  | 'TODAY_NEARBY'
  | 'JOINABLE_FALLBACK';

export const RECOMMEND_REASON_LABEL_KO: Record<RecommendReasonCode, string> = {
  FOLLOWED_STORE: '팔로우한 매장',
  PAST_VENUE: '전에 방문한 매장',
  SAME_REGION: '내 지역',
  PLAYED_TOGETHER: '함께 플레이한 사람이 참여 중',
  PREFERRED_TIME: '자주 가는 시간대',
  URGENT: '오늘 긴급 모집',
  TODAY_NEARBY: '근처에서 오늘 모집 중',
  JOINABLE_FALLBACK: '지금 참가 가능한 조인',
};

export const RECOMMEND_SCORE = {
  FOLLOWED_STORE: 30,
  PAST_VENUE: 20,
  SAME_REGION: 15,
  PLAYED_TOGETHER: 15,
  PREFERRED_TIME: 10,
  URGENT: 10,
  TODAY_NEARBY: 8,
  JOINABLE_FALLBACK: 1,
} as const;

export type RecommendCandidate = {
  joinId: string;
  status: string;
  startAt: Date | string;
  plannedPlayerCount: number;
  confirmedPlayerCount: number;
  isUrgent: boolean;
  hostUserId: string;
  venueId: string;
  golfFacilityId: string | null;
  sido: string | null;
  sigungu: string | null;
  /** Hour 0-23 in KST of startAt */
  startHourKst: number;
  participantUserIds: string[];
};

export type RecommendUserContext = {
  userId: string;
  followedFacilityIds: Set<string>;
  pastAttendedVenueIds: Set<string>;
  preferredHours: Set<number>;
  regionPrefs: Array<{ sido: string; sigungu: string }>;
  playedTogetherUserIds: Set<string>;
};

export type ScoredRecommendation = {
  joinId: string;
  score: number;
  reason: RecommendReasonCode;
  signals: RecommendReasonCode[];
};

const EXCLUDED = new Set(['DRAFT', 'CANCELLED', 'COMPLETED', 'SETTLING']);

export function isRecommendableJoin(
  c: RecommendCandidate,
  userId: string,
  now = new Date(),
): boolean {
  if (EXCLUDED.has(c.status)) return false;
  if (c.hostUserId === userId) return false;
  if (c.participantUserIds.includes(userId)) return false;
  const start = new Date(c.startAt);
  if (!(start.getTime() > now.getTime())) return false;
  if (c.status === 'FULL') return false;
  if (c.confirmedPlayerCount >= c.plannedPlayerCount) return false;
  if (!['OPEN', 'CONFIRMED', 'IN_PROGRESS'].includes(c.status)) return false;
  return true;
}

function sameRegion(
  c: RecommendCandidate,
  prefs: Array<{ sido: string; sigungu: string }>,
): boolean {
  if (!c.sido) return false;
  return prefs.some(
    (p) =>
      p.sido === c.sido &&
      (!p.sigungu || !c.sigungu || p.sigungu === c.sigungu),
  );
}

function isTodayKst(startAt: Date | string, now = new Date()): boolean {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(new Date(startAt)) === fmt.format(now);
}

/**
 * Score one candidate. Returns null if not recommendable.
 */
export function scoreRecommendation(
  c: RecommendCandidate,
  ctx: RecommendUserContext,
  now = new Date(),
): ScoredRecommendation | null {
  if (!isRecommendableJoin(c, ctx.userId, now)) return null;

  const signals: RecommendReasonCode[] = [];
  let score = 0;

  if (c.golfFacilityId && ctx.followedFacilityIds.has(c.golfFacilityId)) {
    score += RECOMMEND_SCORE.FOLLOWED_STORE;
    signals.push('FOLLOWED_STORE');
  }
  if (ctx.pastAttendedVenueIds.has(c.venueId)) {
    score += RECOMMEND_SCORE.PAST_VENUE;
    signals.push('PAST_VENUE');
  }
  if (sameRegion(c, ctx.regionPrefs)) {
    score += RECOMMEND_SCORE.SAME_REGION;
    signals.push('SAME_REGION');
  }
  if (c.participantUserIds.some((id) => ctx.playedTogetherUserIds.has(id))) {
    score += RECOMMEND_SCORE.PLAYED_TOGETHER;
    signals.push('PLAYED_TOGETHER');
  }
  if (ctx.preferredHours.has(c.startHourKst)) {
    score += RECOMMEND_SCORE.PREFERRED_TIME;
    signals.push('PREFERRED_TIME');
  }
  if (c.isUrgent) {
    score += RECOMMEND_SCORE.URGENT;
    signals.push('URGENT');
  }
  if (isTodayKst(c.startAt, now) && sameRegion(c, ctx.regionPrefs)) {
    score += RECOMMEND_SCORE.TODAY_NEARBY;
    signals.push('TODAY_NEARBY');
  }

  if (signals.length === 0) {
    score += RECOMMEND_SCORE.JOINABLE_FALLBACK;
    signals.push('JOINABLE_FALLBACK');
  }

  // Highest-priority reason for UI (order of push = priority).
  const reason = signals[0]!;
  return { joinId: c.joinId, score, reason, signals };
}

export function rankRecommendations(
  candidates: RecommendCandidate[],
  ctx: RecommendUserContext,
  opts?: { limit?: number; now?: Date },
): ScoredRecommendation[] {
  const now = opts?.now ?? new Date();
  const limit = opts?.limit ?? 5;
  const scored: ScoredRecommendation[] = [];
  for (const c of candidates) {
    const s = scoreRecommendation(c, ctx, now);
    if (s) scored.push(s);
  }
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.joinId.localeCompare(b.joinId);
  });
  return scored.slice(0, limit);
}

/** Infer preferred hours from past attended start hours (mode ±1). */
export function inferPreferredHours(hours: number[]): Set<number> {
  if (hours.length === 0) return new Set();
  const counts = new Map<number, number>();
  for (const h of hours) {
    counts.set(h, (counts.get(h) ?? 0) + 1);
  }
  let best = -1;
  let bestN = 0;
  for (const [h, n] of counts) {
    if (n > bestN) {
      best = h;
      bestN = n;
    }
  }
  if (best < 0 || bestN < 2) return new Set();
  const set = new Set<number>([best]);
  set.add((best + 23) % 24);
  set.add((best + 1) % 24);
  return set;
}
