import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canApproveStoreBannerAd,
  canRejectStoreBannerAd,
  canScheduleStoreBannerAd,
  isStoreBannerAdPublic,
  resolveStoreBannerAdStatus,
  validateBannerSchedule,
} from './store-banner-ad';

const now = new Date('2026-09-18T00:00:00.000Z');

test('banner ad statuses follow request → approve/reject → schedule → expire', () => {
  assert.equal(canApproveStoreBannerAd('REQUESTED'), true);
  assert.equal(canApproveStoreBannerAd('APPROVED'), false);
  assert.equal(canRejectStoreBannerAd('APPROVED'), true);
  assert.equal(canScheduleStoreBannerAd('APPROVED'), true);
  assert.equal(canScheduleStoreBannerAd('REQUESTED'), false);
  assert.equal(isStoreBannerAdPublic('ACTIVE'), true);
  assert.equal(isStoreBannerAdPublic('APPROVED'), false);
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
        status: 'ACTIVE',
        startsAt: new Date('2026-09-20T00:00:00.000Z'),
        endsAt: new Date('2026-10-01T00:00:00.000Z'),
      },
      now,
    ),
    'APPROVED',
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
