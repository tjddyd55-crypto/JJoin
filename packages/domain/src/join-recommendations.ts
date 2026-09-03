/**
 * Explainable join recommendations — rule-based scoring (no ML).
 * Scores are internal only; UI shows reasons, never raw scores.
 */

import {
  canApplyMatchingGenderSlot,
  type MatchingGender,
} from './store-matching';

export type RecommendReasonCode =
  | 'PLAYED_TOGETHER_HOST'
  | 'PLAYED_TOGETHER_PARTICIPANT'
  | 'ALMOST_FILLED'
  | 'NEARBY'
  | 'CLOSING_SOON'
  | 'HIGH_RATED_HOST'
  | 'FREQUENT_VENUE'
  | 'FOLLOWED_STORE'
  | 'PAST_VENUE'
  | 'SAME_REGION'
  | 'PLAYED_TOGETHER'
  | 'PREFERRED_TIME'
  | 'URGENT'
  | 'TODAY_NEARBY'
  | 'JOINABLE_FALLBACK';

/** Centralized weights — edit here, not scattered in callers. */
export const RECOMMENDATION_WEIGHTS = {
  playedTogetherParticipant: 40,
  frequentPlayedTogetherExtra: 10, // playedCount >= 3
  frequentPlayedTogetherExtraHigh: 5, // playedCount >= 5 (additional)
  playedTogetherParticipantCap: 50,
  playedTogetherHost: 35,
  nearbyLe3km: 20,
  nearbyLe5km: 12,
  nearbyLe10km: 6,
  almostFilledRemaining1: 20,
  almostFilledRemaining2: 10,
  closingSoonToday: 15,
  closingSoon24h: 10,
  closingSoon48h: 5,
  hostRatingGe48: 15,
  hostRatingGe45: 10,
  hostRatingMinReviewsPartial: 3,
  hostRatingMinReviewsFull: 5,
  frequentVenueGe2: 10,
  frequentVenueGe3: 15,
  followedStore: 30,
  pastVenue: 20,
  sameRegion: 15,
  preferredTime: 10,
  urgent: 10,
  todayNearbyRegion: 8,
  joinableFallback: 1,
  /** Recency: sooner start within 7d gets up to this bonus. */
  recencyMax: 5,
} as const;

/** @deprecated Prefer RECOMMENDATION_WEIGHTS — kept for older callers. */
export const RECOMMEND_SCORE = {
  FOLLOWED_STORE: RECOMMENDATION_WEIGHTS.followedStore,
  PAST_VENUE: RECOMMENDATION_WEIGHTS.pastVenue,
  SAME_REGION: RECOMMENDATION_WEIGHTS.sameRegion,
  PLAYED_TOGETHER: RECOMMENDATION_WEIGHTS.playedTogetherParticipant,
  PREFERRED_TIME: RECOMMENDATION_WEIGHTS.preferredTime,
  URGENT: RECOMMENDATION_WEIGHTS.urgent,
  TODAY_NEARBY: RECOMMENDATION_WEIGHTS.todayNearbyRegion,
  JOINABLE_FALLBACK: RECOMMENDATION_WEIGHTS.joinableFallback,
} as const;

export const RECOMMEND_REASON_LABEL_KO: Record<RecommendReasonCode, string> = {
  PLAYED_TOGETHER_HOST: '전에 같이 친 분이 만든 조인이에요',
  PLAYED_TOGETHER_PARTICIPANT: '같이 친 사람이 참여 중이에요',
  ALMOST_FILLED: '1명만 더 모이면 성사돼요',
  NEARBY: '내 주변 조인이에요',
  CLOSING_SOON: '곧 모집이 마감돼요',
  HIGH_RATED_HOST: '평점이 좋은 방장이에요',
  FREQUENT_VENUE: '자주 이용한 매장이에요',
  FOLLOWED_STORE: '팔로우한 매장',
  PAST_VENUE: '전에 방문한 매장',
  SAME_REGION: '내 지역',
  PLAYED_TOGETHER: '함께 플레이한 사람이 참여 중',
  PREFERRED_TIME: '자주 가는 시간대',
  URGENT: '오늘 긴급 모집',
  TODAY_NEARBY: '근처에서 오늘 모집 중',
  JOINABLE_FALLBACK: '지금 참가 가능한 조인',
};

/** Short UI tags for join cards (max 2). Push/alerts may use RECOMMEND_REASON_LABEL_KO. */
export const RECOMMEND_REASON_SHORT_LABEL_KO: Record<RecommendReasonCode, string> = {
  PLAYED_TOGETHER_HOST: '함께 친 방장',
  PLAYED_TOGETHER_PARTICIPANT: '함께 친 사람',
  ALMOST_FILLED: '마감 임박',
  NEARBY: '내 주변',
  CLOSING_SOON: '곧 마감',
  HIGH_RATED_HOST: '평점 좋은 방장',
  FREQUENT_VENUE: '자주 가는 매장',
  FOLLOWED_STORE: '팔로우 매장',
  PAST_VENUE: '방문한 매장',
  SAME_REGION: '내 지역',
  PLAYED_TOGETHER: '함께 친 사람',
  PREFERRED_TIME: '선호 시간',
  URGENT: '긴급 모집',
  TODAY_NEARBY: '오늘 · 근처',
  JOINABLE_FALLBACK: '참가 가능',
};

/** Reason display priority (lower index = higher priority). Max 2 shown. */
export const RECOMMEND_REASON_PRIORITY: RecommendReasonCode[] = [
  'PLAYED_TOGETHER_HOST',
  'PLAYED_TOGETHER_PARTICIPANT',
  'PLAYED_TOGETHER',
  'ALMOST_FILLED',
  'NEARBY',
  'CLOSING_SOON',
  'HIGH_RATED_HOST',
  'FREQUENT_VENUE',
  'FOLLOWED_STORE',
  'PAST_VENUE',
  'SAME_REGION',
  'PREFERRED_TIME',
  'URGENT',
  'TODAY_NEARBY',
  'JOINABLE_FALLBACK',
];

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
  /** Optional geo (venue or facility). */
  latitude?: number | null;
  longitude?: number | null;
  /** Recruitment deadline when present; else scoring uses startAt. */
  recruitClosesAt?: Date | string | null;
  targetMaleCount?: number | null;
  targetFemaleCount?: number | null;
  /** Confirmed roster genders for matching slots (excludes cancelled). */
  confirmedGenders?: MatchingGender[];
  hostAverageRating?: number | null;
  hostReviewCount?: number | null;
};

export type RecommendUserContext = {
  userId: string;
  followedFacilityIds: Set<string>;
  pastAttendedVenueIds: Set<string>;
  /** venueId → completed visit count (recent history). */
  venueVisitCounts?: Map<string, number>;
  preferredHours: Set<number>;
  regionPrefs: Array<{ sido: string; sigungu: string }>;
  /** Legacy set — still used when playedTogetherCounts omitted. */
  playedTogetherUserIds: Set<string>;
  /** userId → completed co-play count. */
  playedTogetherCounts?: Map<string, number>;
  viewerLatitude?: number | null;
  viewerLongitude?: number | null;
  viewerGender?: MatchingGender;
};

export type ScoredRecommendation = {
  joinId: string;
  score: number;
  reason: RecommendReasonCode;
  reasons: RecommendReasonCode[];
  signals: RecommendReasonCode[];
  distanceMeters?: number | null;
};

const EXCLUDED = new Set(['DRAFT', 'CANCELLED', 'COMPLETED', 'SETTLING', 'EXPIRED']);

export function haversineMeters(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
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

function isTodayKst(instant: Date | string, now = new Date()): boolean {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(new Date(instant)) === fmt.format(now);
}

function closingDeadline(c: RecommendCandidate): Date {
  if (c.recruitClosesAt) return new Date(c.recruitClosesAt);
  return new Date(c.startAt);
}

function playedCountFor(
  userId: string,
  ctx: RecommendUserContext,
): number {
  if (ctx.playedTogetherCounts?.has(userId)) {
    return ctx.playedTogetherCounts.get(userId) ?? 0;
  }
  return ctx.playedTogetherUserIds.has(userId) ? 1 : 0;
}

export function isGenderCompatibleJoin(
  c: RecommendCandidate,
  viewerGender: MatchingGender,
): boolean {
  const male = c.targetMaleCount;
  const female = c.targetFemaleCount;
  if (male == null || female == null) return true;
  if (male <= 0 && female <= 0) return true;
  return canApplyMatchingGenderSlot({
    applicantGender: viewerGender,
    targetMaleCount: male,
    targetFemaleCount: female,
    confirmedGenders: c.confirmedGenders ?? [],
  });
}

export function isRecommendableJoin(
  c: RecommendCandidate,
  userId: string,
  now = new Date(),
  viewerGender?: MatchingGender,
): boolean {
  if (EXCLUDED.has(c.status)) return false;
  if (c.hostUserId === userId) return false;
  if (c.participantUserIds.includes(userId)) return false;
  const start = new Date(c.startAt);
  if (!(start.getTime() > now.getTime())) return false;
  const deadline = closingDeadline(c);
  if (deadline.getTime() <= now.getTime() && c.recruitClosesAt) return false;
  if (c.status === 'FULL') return false;
  if (c.confirmedPlayerCount >= c.plannedPlayerCount) return false;
  if (!['OPEN', 'CONFIRMED', 'IN_PROGRESS'].includes(c.status)) return false;
  if (viewerGender !== undefined && !isGenderCompatibleJoin(c, viewerGender)) {
    return false;
  }
  return true;
}

export function hostRatingBonus(
  averageRating: number | null | undefined,
  reviewCount: number | null | undefined,
  weights = RECOMMENDATION_WEIGHTS,
): number {
  const count = reviewCount ?? 0;
  const rating = averageRating ?? 0;
  if (count < weights.hostRatingMinReviewsPartial) return 0;
  let bonus = 0;
  if (rating >= 4.8) bonus = weights.hostRatingGe48;
  else if (rating >= 4.5) bonus = weights.hostRatingGe45;
  if (count < weights.hostRatingMinReviewsFull) {
    return Math.floor(bonus / 2);
  }
  return bonus;
}

export function nearbyDistanceBonus(
  distanceMeters: number | null | undefined,
  weights = RECOMMENDATION_WEIGHTS,
): number {
  if (distanceMeters == null || !Number.isFinite(distanceMeters)) return 0;
  if (distanceMeters <= 3000) return weights.nearbyLe3km;
  if (distanceMeters <= 5000) return weights.nearbyLe5km;
  if (distanceMeters <= 10_000) return weights.nearbyLe10km;
  return 0;
}

export function almostFilledBonus(
  planned: number,
  confirmed: number,
  weights = RECOMMENDATION_WEIGHTS,
): { bonus: number; remaining1: boolean } {
  const remaining = Math.max(0, planned - confirmed);
  if (remaining === 1) return { bonus: weights.almostFilledRemaining1, remaining1: true };
  if (remaining === 2) return { bonus: weights.almostFilledRemaining2, remaining1: false };
  return { bonus: 0, remaining1: false };
}

export function closingSoonBonus(
  deadline: Date,
  now: Date,
  weights = RECOMMENDATION_WEIGHTS,
): number {
  const ms = deadline.getTime() - now.getTime();
  if (ms <= 0) return 0;
  const hours = ms / 3_600_000;
  if (isTodayKst(deadline, now)) return weights.closingSoonToday;
  if (hours <= 24) return weights.closingSoon24h;
  if (hours <= 48) return weights.closingSoon48h;
  return 0;
}

export function playedTogetherParticipantBonus(
  participantUserIds: string[],
  hostUserId: string,
  ctx: RecommendUserContext,
  weights = RECOMMENDATION_WEIGHTS,
): number {
  let total = 0;
  for (const id of participantUserIds) {
    if (id === hostUserId || id === ctx.userId) continue;
    const count = playedCountFor(id, ctx);
    if (count <= 0) continue;
    let add = weights.playedTogetherParticipant;
    if (count >= 3) add += weights.frequentPlayedTogetherExtra;
    if (count >= 5) add += weights.frequentPlayedTogetherExtraHigh;
    total += add;
  }
  return Math.min(weights.playedTogetherParticipantCap, total);
}

export function buildRecommendationReasons(
  signals: RecommendReasonCode[],
  max = 2,
): RecommendReasonCode[] {
  const unique = [...new Set(signals)];
  unique.sort((a, b) => {
    const ia = RECOMMEND_REASON_PRIORITY.indexOf(a);
    const ib = RECOMMEND_REASON_PRIORITY.indexOf(b);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
  });
  return unique.slice(0, max);
}

/**
 * Score one candidate. Returns null if not recommendable.
 */
export function scoreRecommendation(
  c: RecommendCandidate,
  ctx: RecommendUserContext,
  now = new Date(),
): ScoredRecommendation | null {
  if (!isRecommendableJoin(c, ctx.userId, now, ctx.viewerGender)) return null;

  const signals: RecommendReasonCode[] = [];
  let score = 0;
  let distanceMeters: number | null = null;

  const hostPlayed = playedCountFor(c.hostUserId, ctx);
  if (hostPlayed > 0) {
    score += RECOMMENDATION_WEIGHTS.playedTogetherHost;
    signals.push('PLAYED_TOGETHER_HOST');
  }

  const ptBonus = playedTogetherParticipantBonus(
    c.participantUserIds,
    c.hostUserId,
    ctx,
  );
  if (ptBonus > 0) {
    score += ptBonus;
    signals.push('PLAYED_TOGETHER_PARTICIPANT');
  }

  const seats = almostFilledBonus(c.plannedPlayerCount, c.confirmedPlayerCount);
  if (seats.bonus > 0) {
    score += seats.bonus;
    signals.push('ALMOST_FILLED');
  }

  if (
    ctx.viewerLatitude != null &&
    ctx.viewerLongitude != null &&
    c.latitude != null &&
    c.longitude != null &&
    Number.isFinite(c.latitude) &&
    Number.isFinite(c.longitude)
  ) {
    distanceMeters = haversineMeters(
      ctx.viewerLatitude,
      ctx.viewerLongitude,
      c.latitude,
      c.longitude,
    );
    const nb = nearbyDistanceBonus(distanceMeters);
    if (nb > 0) {
      score += nb;
      signals.push('NEARBY');
    }
  }

  const deadline = closingDeadline(c);
  const closeBonus = closingSoonBonus(deadline, now);
  if (closeBonus > 0) {
    score += closeBonus;
    signals.push('CLOSING_SOON');
  }

  const ratingBonus = hostRatingBonus(c.hostAverageRating, c.hostReviewCount);
  if (ratingBonus > 0) {
    score += ratingBonus;
    signals.push('HIGH_RATED_HOST');
  }

  const visits =
    ctx.venueVisitCounts?.get(c.venueId) ??
    (ctx.pastAttendedVenueIds.has(c.venueId) ? 1 : 0);
  if (visits >= 3) {
    score += RECOMMENDATION_WEIGHTS.frequentVenueGe3;
    signals.push('FREQUENT_VENUE');
  } else if (visits >= 2) {
    score += RECOMMENDATION_WEIGHTS.frequentVenueGe2;
    signals.push('FREQUENT_VENUE');
  } else if (visits >= 1 || ctx.pastAttendedVenueIds.has(c.venueId)) {
    score += RECOMMENDATION_WEIGHTS.pastVenue;
    signals.push('PAST_VENUE');
  }

  if (c.golfFacilityId && ctx.followedFacilityIds.has(c.golfFacilityId)) {
    score += RECOMMENDATION_WEIGHTS.followedStore;
    signals.push('FOLLOWED_STORE');
  }
  if (sameRegion(c, ctx.regionPrefs)) {
    score += RECOMMENDATION_WEIGHTS.sameRegion;
    signals.push('SAME_REGION');
  }
  if (ctx.preferredHours.has(c.startHourKst)) {
    score += RECOMMENDATION_WEIGHTS.preferredTime;
    signals.push('PREFERRED_TIME');
  }
  if (c.isUrgent) {
    score += RECOMMENDATION_WEIGHTS.urgent;
    signals.push('URGENT');
  }
  if (isTodayKst(c.startAt, now) && sameRegion(c, ctx.regionPrefs)) {
    score += RECOMMENDATION_WEIGHTS.todayNearbyRegion;
    signals.push('TODAY_NEARBY');
  }

  // Soft recency: sooner start within 7 days.
  const hoursToStart =
    (new Date(c.startAt).getTime() - now.getTime()) / 3_600_000;
  if (hoursToStart > 0 && hoursToStart <= 24 * 7) {
    const frac = 1 - hoursToStart / (24 * 7);
    score += Math.round(RECOMMENDATION_WEIGHTS.recencyMax * frac);
  }

  if (signals.length === 0) {
    score += RECOMMENDATION_WEIGHTS.joinableFallback;
    signals.push('JOINABLE_FALLBACK');
  }

  const reasons = buildRecommendationReasons(signals, 2);
  const reason = reasons[0]!;
  return {
    joinId: c.joinId,
    score,
    reason,
    reasons,
    signals,
    distanceMeters,
  };
}

/**
 * Rank candidates. Diversity: at most 2 joins per host in the returned list.
 */
export function rankRecommendations(
  candidates: RecommendCandidate[],
  ctx: RecommendUserContext,
  opts?: { limit?: number; now?: Date; maxPerHost?: number },
): ScoredRecommendation[] {
  const now = opts?.now ?? new Date();
  const limit = opts?.limit ?? 5;
  const maxPerHost = opts?.maxPerHost ?? 2;
  const scored: ScoredRecommendation[] = [];
  const byJoin = new Map(candidates.map((c) => [c.joinId, c]));

  for (const c of candidates) {
    const s = scoreRecommendation(c, ctx, now);
    if (s) scored.push(s);
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const ca = byJoin.get(a.joinId);
    const cb = byJoin.get(b.joinId);
    const startA = ca ? new Date(ca.startAt).getTime() : 0;
    const startB = cb ? new Date(cb.startAt).getTime() : 0;
    if (startA !== startB) return startA - startB;
    return a.joinId.localeCompare(b.joinId);
  });

  const hostCounts = new Map<string, number>();
  const diversified: ScoredRecommendation[] = [];
  for (const row of scored) {
    const host = byJoin.get(row.joinId)?.hostUserId ?? '';
    const n = hostCounts.get(host) ?? 0;
    if (n >= maxPerHost) continue;
    hostCounts.set(host, n + 1);
    diversified.push(row);
    if (diversified.length >= limit) break;
  }
  return diversified;
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

/** Strong signal for optional recommendation push (capability). */
export function isStrongRecommendationAlertSignal(
  signals: RecommendReasonCode[],
): boolean {
  const hasPlayed =
    signals.includes('PLAYED_TOGETHER_HOST') ||
    signals.includes('PLAYED_TOGETHER_PARTICIPANT') ||
    signals.includes('PLAYED_TOGETHER');
  const almost = signals.includes('ALMOST_FILLED');
  return hasPlayed && almost;
}
