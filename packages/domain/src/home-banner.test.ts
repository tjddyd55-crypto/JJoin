import assert from 'node:assert/strict';
import test from 'node:test';
import { isHomeBannerVisible, selectVisibleHomeBanners } from './home-banner';
import {
  canApproveStoreBannerAd,
  canRejectStoreBannerAd,
  resolveStoreBannerAdStatus,
  validateBannerSchedule,
} from './store-banner-ad';

const now = new Date('2026-09-18T00:00:00.000Z');

test('home banner visibility respects active window', () => {
  assert.equal(
    isHomeBannerVisible(
      {
        id: '1',
        active: true,
        startsAt: new Date('2026-09-01T00:00:00.000Z'),
        endsAt: new Date('2026-09-30T00:00:00.000Z'),
        sortOrder: 0,
      },
      now,
    ),
    true,
  );
  assert.equal(
    isHomeBannerVisible(
      {
        id: '2',
        active: false,
        startsAt: null,
        endsAt: null,
        sortOrder: 0,
      },
      now,
    ),
    false,
  );
  const visible = selectVisibleHomeBanners(
    [
      { id: 'b', active: true, startsAt: null, endsAt: null, sortOrder: 2 },
      { id: 'a', active: true, startsAt: null, endsAt: null, sortOrder: 1 },
    ],
    now,
  );
  assert.deepEqual(visible.map((b) => b.id), ['a', 'b']);
});

test('banner ad status resolves approve/reject/schedule windows', () => {
  assert.equal(canApproveStoreBannerAd('REQUESTED'), true);
  assert.equal(canRejectStoreBannerAd('REQUESTED'), true);
  assert.equal(
    resolveStoreBannerAdStatus(
      {
        status: 'APPROVED',
        startsAt: new Date('2026-09-01T00:00:00.000Z'),
        endsAt: new Date('2026-10-01T00:00:00.000Z'),
      },
      now,
    ),
    'ACTIVE',
  );
  assert.equal(
    resolveStoreBannerAdStatus(
      {
        status: 'APPROVED',
        startsAt: new Date('2026-08-01T00:00:00.000Z'),
        endsAt: new Date('2026-08-31T00:00:00.000Z'),
      },
      now,
    ),
    'EXPIRED',
  );
  assert.equal(
    validateBannerSchedule({
      startsAt: new Date('2026-09-20T00:00:00.000Z'),
      endsAt: new Date('2026-09-10T00:00:00.000Z'),
    }).ok,
    false,
  );
});
