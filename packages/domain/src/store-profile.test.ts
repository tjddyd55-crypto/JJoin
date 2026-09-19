import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildStoreProfileObjectKey,
  computeStoreMinPrice,
  formatOperatingHoursLine,
  isOwnedStoreProfileObjectKey,
  sortStorePriceSlots,
} from './store-profile';

test('sortStorePriceSlots orders by day type then start time', () => {
  const sorted = sortStorePriceSlots([
    { dayType: 'WEEKEND', startTime: '07:00', endTime: '12:00', price: 22000 },
    { dayType: 'WEEKDAY', startTime: '18:00', endTime: '24:00', price: 22000 },
    { dayType: 'WEEKDAY', startTime: '07:00', endTime: '12:00', price: 15000 },
  ]);
  assert.equal(sorted[0].dayType, 'WEEKDAY');
  assert.equal(sorted[0].startTime, '07:00');
  assert.equal(sorted[2].dayType, 'WEEKEND');
});

test('computeStoreMinPrice returns minimum slot price', () => {
  assert.equal(
    computeStoreMinPrice([
      { dayType: 'WEEKDAY', startTime: '07:00', endTime: '12:00', price: 15000 },
      { dayType: 'WEEKEND', startTime: '07:00', endTime: '12:00', price: 22000 },
    ]),
    15000,
  );
});

test('isOwnedStoreProfileObjectKey validates store gallery prefix', () => {
  const key = buildStoreProfileObjectKey({
    environmentPrefix: 'development',
    ownershipId: 'own-1',
    kind: 'gallery',
    fileId: 'file-1',
    extension: 'png',
  });
  assert.equal(
    isOwnedStoreProfileObjectKey({
      objectKey: key,
      environmentPrefix: 'development',
      ownershipId: 'own-1',
    }),
    true,
  );
  assert.equal(
    isOwnedStoreProfileObjectKey({
      objectKey: key,
      environmentPrefix: 'development',
      ownershipId: 'own-2',
    }),
    false,
  );
  assert.equal(
    isOwnedStoreProfileObjectKey({
      objectKey: 'development/profiles/user-1/gallery/file-1.png',
      environmentPrefix: 'development',
      ownershipId: 'own-1',
    }),
    false,
  );
});

test('formatOperatingHoursLine renders closed and 24h', () => {
  assert.equal(
    formatOperatingHoursLine({ dayGroup: 'WEEKDAY', isClosed: true }),
    '평일 휴무',
  );
  assert.equal(
    formatOperatingHoursLine({ dayGroup: 'WEEKEND', is24Hours: true }),
    '주말 24시간',
  );
});
