import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MAX_PROFILE_GALLERY_PHOTOS } from '@jjoin/domain';
import type { PublicUserProfileDto } from '@jjoin/types';
import { listRenderableProfilePhotos } from './profile-gallery';

function galleryCount(profile: PublicUserProfileDto): number {
  return profile.profilePhotos?.length ?? 0;
}

test('profile without photos keeps optional gallery empty', () => {
  const profile: PublicUserProfileDto = {
    id: 'u1',
    nickname: 'nick',
    verifiedBadge: false,
    avatarUrl: null,
    profilePhotos: [],
    genderDisplay: null,
    ageBand: null,
    regionLabel: null,
    bio: null,
    sportProfiles: [],
    participationCount: 0,
  };
  assert.equal(profile.avatarUrl, null);
  assert.equal(galleryCount(profile), 0);
});

test('profile gallery respects max 5 photos in UI contract', () => {
  const photos = Array.from({ length: MAX_PROFILE_GALLERY_PHOTOS }, (_, index) => ({
    id: `p${index}`,
    imageUrl: `https://cdn.example.com/p${index}.jpg`,
    sortOrder: index,
  }));
  const profile: PublicUserProfileDto = {
    id: 'u1',
    nickname: 'nick',
    verifiedBadge: false,
    avatarUrl: 'https://cdn.example.com/avatar.jpg',
    profilePhotos: photos,
    genderDisplay: null,
    ageBand: null,
    regionLabel: null,
    bio: null,
    sportProfiles: [],
    participationCount: 0,
  };
  assert.equal(galleryCount(profile), MAX_PROFILE_GALLERY_PHOTOS);
  assert.equal(profile.avatarUrl?.includes('avatar.jpg'), true);
  assert.equal(listRenderableProfilePhotos(photos).length, MAX_PROFILE_GALLERY_PHOTOS);
});

test('public gallery keeps every resolved photo and drops blank urls', () => {
  const photos = listRenderableProfilePhotos([
    { id: 'a', imageUrl: 'https://cdn.example/a.jpg', sortOrder: 0, isPrimary: true },
    { id: 'b', imageUrl: '  ', sortOrder: 1 },
    { id: 'c', imageUrl: 'https://cdn.example/c.jpg', sortOrder: 2 },
    { id: 'd', imageUrl: null, sortOrder: 3 },
  ]);
  assert.deepEqual(photos.map((photo) => photo.id), ['a', 'c']);
});
