import type { JoinReviewPostDetailDto } from '@jjoin/types';
import { resolveApiBaseUrl } from '../../lib/api';
import { getSecureSessionStore } from '../../session/SessionContext';

export async function uploadJoinReviewPostPhoto(
  reviewId: string,
  localUri: string,
): Promise<JoinReviewPostDetailDto> {
  const tokenStore = getSecureSessionStore();
  const token = await tokenStore.getToken();
  const base = resolveApiBaseUrl();
  const form = new FormData();
  form.append('file', {
    uri: localUri,
    name: 'review.jpg',
    type: 'image/jpeg',
  } as unknown as Blob);
  const res = await fetch(`${base}/join-reviews/${reviewId}/photos`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    throw new Error(`upload_join_review_photo_failed:${res.status}`);
  }
  return (await res.json()) as JoinReviewPostDetailDto;
}
