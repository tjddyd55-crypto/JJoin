/**
 * Home banner DTO imageUrl must be a loadable public media URL, never a bare R2 key.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  HomeBannersService,
  toStoredHomeBannerImageObjectKey,
} from './home-banners.service';

const INVESTOR_BANNER_KEY = 'development/investor-demo/v2/banners/field-weekend.jpg';

function publicMediaUrl(key: string): string {
  return `https://api.example.com/media/objects?key=${encodeURIComponent(key)}`;
}

test('toStoredHomeBannerImageObjectKey keeps object keys and unwraps media/objects URLs', () => {
  assert.equal(toStoredHomeBannerImageObjectKey(null), null);
  assert.equal(toStoredHomeBannerImageObjectKey('   '), null);
  assert.equal(toStoredHomeBannerImageObjectKey(INVESTOR_BANNER_KEY), INVESTOR_BANNER_KEY);
  assert.equal(
    toStoredHomeBannerImageObjectKey(publicMediaUrl(INVESTOR_BANNER_KEY)),
    INVESTOR_BANNER_KEY,
  );
});

test('listPublic imageUrl is a public URL or null, never a bare storage key', async () => {
  const storage = {
    getPublicUrl(objectKey: string | null | undefined) {
      if (!objectKey) return null;
      if (objectKey.startsWith('http://') || objectKey.startsWith('https://')) return objectKey;
      return publicMediaUrl(objectKey);
    },
  };
  const prisma = {
    homeBanner: {
      async findMany() {
        return [
          {
            id: 'b1',
            title: '필드 주말',
            subtitle: null,
            imageObjectKey: INVESTOR_BANNER_KEY,
            href: null,
            sortOrder: 0,
            active: true,
            startsAt: null,
            endsAt: null,
          },
          {
            id: 'b2',
            title: '이미지 없음',
            subtitle: null,
            imageObjectKey: null,
            href: null,
            sortOrder: 1,
            active: true,
            startsAt: null,
            endsAt: null,
          },
        ];
      },
    },
  };
  const flags = {
    async getFlags() {
      return { homeBannersEnabled: true };
    },
  };

  const service = new HomeBannersService(prisma as never, flags as never, storage as never);
  const items = await service.listPublic();

  assert.equal(items.length, 2);
  assert.equal(items[0]?.imageUrl, publicMediaUrl(INVESTOR_BANNER_KEY));
  assert.match(items[0]?.imageUrl ?? '', /^https:\/\//);
  assert.notEqual(items[0]?.imageUrl, INVESTOR_BANNER_KEY);
  assert.equal(items[1]?.imageUrl, null);
});
