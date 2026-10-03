import type { PickedProfileImage } from '../profile/profile-image-upload-payload';

export type PendingReviewPhoto = {
  key: string;
  picked: PickedProfileImage;
  uploaded: boolean;
};

export function createPendingReviewPhoto(picked: PickedProfileImage): PendingReviewPhoto {
  return {
    key: `${picked.uri}-${picked.fileName}-${Date.now()}`,
    picked,
    uploaded: false,
  };
}

export function pendingPhotosToUpload(photos: PendingReviewPhoto[]): PendingReviewPhoto[] {
  return photos.filter((p) => !p.uploaded);
}
