import type { JoinReviewPostDetailDto } from '@jjoin/types';
import type { ApiClient } from '@jjoin/api-client';
import { isApiRequestError } from '@jjoin/api-client';
import type { PickedProfileImage } from '../profile/profile-image-upload-payload';
import { toUploadPayload } from '../profile/profile-image-upload-payload';
import { prepareReviewPhotoForUpload, ReviewPhotoPrepError } from './prepare-review-photo-upload';
import type { PendingReviewPhoto } from './join-review-pending-photos';

export type { PendingReviewPhoto } from './join-review-pending-photos';
export { createPendingReviewPhoto, pendingPhotosToUpload } from './join-review-pending-photos';

export type UploadReviewPhotosResult = {
  post: JoinReviewPostDetailDto;
  successCount: number;
  failCount: number;
  lastError: unknown | null;
};

export async function uploadPendingReviewPhotosSequential(
  api: ApiClient,
  reviewId: string,
  pending: PendingReviewPhoto[],
): Promise<UploadReviewPhotosResult> {
  let post: JoinReviewPostDetailDto | null = null;
  let successCount = 0;
  let failCount = 0;
  let lastError: unknown | null = null;

  for (const item of pending) {
    if (item.uploaded) continue;
    try {
      if (__DEV__) {
        console.log('[join-review-photo] upload-start', {
          reviewId,
          name: item.picked.fileName,
          type: item.picked.mimeType,
          uri: item.picked.uri,
        });
      }
      const prepared = await prepareReviewPhotoForUpload(item.picked);
      post = await api.addJoinReviewPostPhoto(reviewId, toUploadPayload(prepared));
      item.uploaded = true;
      successCount += 1;
      if (__DEV__) {
        console.log('[join-review-photo] upload-response', {
          status: 201,
          photoCount: post.photos.length,
        });
      }
    } catch (error) {
      lastError = error;
      failCount += 1;
      if (__DEV__) {
        const detail =
          error instanceof ReviewPhotoPrepError
            ? { code: error.code }
            : isApiRequestError(error)
              ? { status: error.status, code: error.code, body: error.rawBody.slice(0, 300) }
              : { message: error instanceof Error ? error.message : String(error) };
        console.warn('[join-review-photo] upload-failed', detail);
      }
    }
  }

  if (!post) {
    post = await api.getJoinReviewPost(reviewId);
  }

  return { post, successCount, failCount, lastError };
}
