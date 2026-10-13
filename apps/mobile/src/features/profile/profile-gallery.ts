import type { ProfilePhotoDto } from '@jjoin/types';

export type RenderableProfilePhoto = ProfilePhotoDto & { imageUrl: string };

/** Every gallery row that has a resolved URL. Order follows the API sort. */
export function listRenderableProfilePhotos(
  photos: ProfilePhotoDto[] | null | undefined,
): RenderableProfilePhoto[] {
  const renderable: RenderableProfilePhoto[] = [];
  for (const photo of photos ?? []) {
    const imageUrl = photo.imageUrl?.trim();
    if (!imageUrl) continue;
    renderable.push({ ...photo, imageUrl });
  }
  return renderable;
}
