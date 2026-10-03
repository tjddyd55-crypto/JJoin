export const JOIN_REVIEW_POST_TITLE_MAX = 60;
export const JOIN_REVIEW_POST_CONTENT_MAX = 2000;
export const JOIN_REVIEW_POST_PHOTO_MAX = 5;
export const JOIN_REVIEW_POST_LIST_DEFAULT_LIMIT = 20;
export const JOIN_REVIEW_POST_LIST_MAX_LIMIT = 50;
export const JOIN_REVIEW_POST_CONTENT_PREVIEW_MAX = 120;

export function normalizeJoinReviewPostTitle(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > JOIN_REVIEW_POST_TITLE_MAX) {
    throw new Error('invalid_join_review_post_title');
  }
  return trimmed;
}

export function normalizeJoinReviewPostContent(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > JOIN_REVIEW_POST_CONTENT_MAX) {
    throw new Error('invalid_join_review_post_content');
  }
  return trimmed;
}

export function buildJoinReviewPostContentPreview(content: string): string {
  const normalized = content.replace(/\s+/g, ' ').trim();
  if (normalized.length <= JOIN_REVIEW_POST_CONTENT_PREVIEW_MAX) return normalized;
  return `${normalized.slice(0, JOIN_REVIEW_POST_CONTENT_PREVIEW_MAX - 1)}…`;
}

export function buildJoinReviewPostPhotoObjectKey(params: {
  environmentPrefix: 'development' | 'production';
  postId: string;
  fileId: string;
  extension: 'jpg' | 'png' | 'webp';
}): string {
  const ext = params.extension === 'jpg' ? 'jpg' : params.extension;
  return `${params.environmentPrefix}/join-review-posts/${params.postId}/${params.fileId}.${ext}`;
}

const JOIN_REVIEW_POST_PHOTO_LEAF = /\.(jpg|jpeg|png|webp)$/i;

export function isJoinReviewPostPhotoObjectKey(params: {
  objectKey: string;
  environmentPrefix: 'development' | 'production';
}): boolean {
  const key = params.objectKey.replace(/^\/+/, '');
  const prefix = `${params.environmentPrefix}/join-review-posts/`;
  if (!key.startsWith(prefix) || !JOIN_REVIEW_POST_PHOTO_LEAF.test(key)) return false;
  const rest = key.slice(prefix.length);
  const segments = rest.split('/').filter(Boolean);
  return segments.length === 2;
}
