/**
 * Player subjective review (★1–5 + optional one-line comment).
 * Orthogonal to attendance reliability (COMPLETED/NO_SHOW).
 */

export const PLAYER_REVIEW_RATING_MIN = 1;
export const PLAYER_REVIEW_RATING_MAX = 5;
export const PLAYER_REVIEW_COMMENT_MAX_LENGTH = 100;

export type PlayerReviewParticipationStatus = 'COMPLETED' | string;
export type PlayerReviewJoinStatus = 'COMPLETED' | string;

export type PlayerReviewEligibilityInput = {
  reviewerUserId: string;
  revieweeUserId: string;
  joinStatus: PlayerReviewJoinStatus;
  reviewerParticipationStatus: PlayerReviewParticipationStatus;
  revieweeParticipationStatus: PlayerReviewParticipationStatus;
};

export type PlayerReviewEligibilityResult =
  | { ok: true }
  | { ok: false; reason: string };

export function assertPlayerReviewRating(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(n) || n < PLAYER_REVIEW_RATING_MIN || n > PLAYER_REVIEW_RATING_MAX) {
    throw new Error('invalid_player_review_rating');
  }
  return n;
}

/** Trim; empty/whitespace → null. Caps length. */
export function normalizePlayerReviewComment(
  value: string | null | undefined,
): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > PLAYER_REVIEW_COMMENT_MAX_LENGTH) {
    throw new Error('player_review_comment_too_long');
  }
  return trimmed;
}

/**
 * Review allowed only when join is COMPLETED and both parties ATTENDED (COMPLETED).
 * NO_SHOW / APPROVED-only / self → denied.
 */
export function evaluatePlayerReviewEligibility(
  input: PlayerReviewEligibilityInput,
): PlayerReviewEligibilityResult {
  if (input.reviewerUserId === input.revieweeUserId) {
    return { ok: false, reason: 'self_review_forbidden' };
  }
  if (input.joinStatus !== 'COMPLETED') {
    return { ok: false, reason: 'join_not_completed' };
  }
  if (input.reviewerParticipationStatus !== 'COMPLETED') {
    return { ok: false, reason: 'reviewer_not_attended' };
  }
  if (input.revieweeParticipationStatus !== 'COMPLETED') {
    return { ok: false, reason: 'reviewee_not_attended' };
  }
  return { ok: true };
}

export type PlayerReputationAggregate = {
  reviewCount: number;
  averageRating: number | null;
  /** Always one decimal when average exists (e.g. "4.8", "5.0"). */
  averageRatingDisplay: string | null;
};

export function computePlayerReputation(ratings: readonly number[]): PlayerReputationAggregate {
  const valid = ratings.filter(
    (r) => Number.isInteger(r) && r >= PLAYER_REVIEW_RATING_MIN && r <= PLAYER_REVIEW_RATING_MAX,
  );
  if (valid.length === 0) {
    return { reviewCount: 0, averageRating: null, averageRatingDisplay: null };
  }
  const sum = valid.reduce((a, b) => a + b, 0);
  const averageRating = Math.round((sum / valid.length) * 10) / 10;
  return {
    reviewCount: valid.length,
    averageRating,
    averageRatingDisplay: formatAverageRating(averageRating),
  };
}

export function formatAverageRating(average: number): string {
  return average.toFixed(1);
}

/** Pair list for N COMPLETED attendees (unordered pairs; no self). */
export function playedTogetherPairsFromAttendees(userIds: readonly string[]): Array<[string, string]> {
  const unique = [...new Set(userIds.filter(Boolean))];
  const pairs: Array<[string, string]> = [];
  for (let i = 0; i < unique.length; i += 1) {
    for (let j = i + 1; j < unique.length; j += 1) {
      const a = unique[i]!;
      const b = unique[j]!;
      pairs.push(a < b ? [a, b] : [b, a]);
    }
  }
  return pairs;
}
