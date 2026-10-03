import { isCompletedDiscoveryJoin } from './join-discovery';

export const JOIN_SESSION_REVIEW_TITLE_MAX = 60;
export const JOIN_SESSION_REVIEW_CONTENT_MAX = 2000;
export const JOIN_SESSION_REVIEW_PHOTO_MAX = 5;

const AUTHOR_PARTICIPATION_STATUSES = new Set(['CONFIRMED', 'COMPLETED']);

export type JoinSessionReviewAuthorEligibilityInput = {
  joinStatus: string;
  scheduledEndAt: Date | string;
  participationStatus: string;
  now?: Date;
};

export function evaluateJoinSessionReviewAuthorEligibility(
  input: JoinSessionReviewAuthorEligibilityInput,
): { ok: true } | { ok: false; reason: string } {
  if (
    !isCompletedDiscoveryJoin(
      { status: input.joinStatus, scheduledEndAt: input.scheduledEndAt },
      input.now,
    )
  ) {
    return { ok: false, reason: 'join_not_finished' };
  }
  if (!AUTHOR_PARTICIPATION_STATUSES.has(input.participationStatus)) {
    return { ok: false, reason: 'not_eligible_participant' };
  }
  return { ok: true };
}

export function normalizeJoinSessionReviewTitle(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > JOIN_SESSION_REVIEW_TITLE_MAX) {
    throw new Error('invalid_join_session_review_title');
  }
  return trimmed;
}

export function normalizeJoinSessionReviewContent(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > JOIN_SESSION_REVIEW_CONTENT_MAX) {
    throw new Error('invalid_join_session_review_content');
  }
  return trimmed;
}

export function buildJoinSessionReviewPhotoObjectKey(params: {
  environmentPrefix: 'development' | 'production';
  reviewId: string;
  fileId: string;
  extension: 'jpg' | 'png' | 'webp';
}): string {
  const ext = params.extension === 'jpg' ? 'jpg' : params.extension;
  return `${params.environmentPrefix}/join-reviews/${params.reviewId}/${params.fileId}.${ext}`;
}

const JOIN_SESSION_REVIEW_PHOTO_LEAF = /\.(jpg|jpeg|png|webp)$/i;

/** R2 keys for join session review photos (author eligibility checked before delete). */
export function isJoinSessionReviewPhotoObjectKey(params: {
  objectKey: string;
  environmentPrefix: 'development' | 'production';
}): boolean {
  const key = params.objectKey.replace(/^\/+/, '');
  const prefix = `${params.environmentPrefix}/join-reviews/`;
  if (!key.startsWith(prefix) || !JOIN_SESSION_REVIEW_PHOTO_LEAF.test(key)) return false;
  const rest = key.slice(prefix.length);
  const segments = rest.split('/').filter(Boolean);
  return segments.length === 2;
}
