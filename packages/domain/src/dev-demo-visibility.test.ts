import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isDevInvestorDemoAvatarStorageKey,
  mergeDevDemoRecommendedUserIds,
} from './dev-demo-visibility';

test('demo avatar keys stay on the development investor-demo avatar prefix', () => {
  assert.equal(
    isDevInvestorDemoAvatarStorageKey('development/investor-demo/v2/avatars/hajun.jpg'),
    true,
  );
  assert.equal(
    isDevInvestorDemoAvatarStorageKey('production/investor-demo/v2/avatars/hajun.jpg'),
    false,
  );
  assert.equal(
    isDevInvestorDemoAvatarStorageKey('development/investor-demo/v2/stores/gangnam-g1.jpg'),
    false,
  );
  assert.equal(isDevInvestorDemoAvatarStorageKey(null), false);
});

test('production recommended order ignores demo personas', () => {
  const ids = mergeDevDemoRecommendedUserIds({
    development: false,
    viewerId: 'viewer',
    demoUserIds: ['demo-a', 'demo-b'],
    recentUserIds: ['recent-1', 'viewer', 'recent-2'],
  });
  assert.deepEqual(ids, ['recent-1', 'recent-2']);
});

test('development recommended order shows demo personas to any viewer', () => {
  const ids = mergeDevDemoRecommendedUserIds({
    development: true,
    viewerId: 'kakao-new',
    demoUserIds: ['demo-b', 'demo-a'],
    recentUserIds: ['recent-1', 'demo-a', 'kakao-new'],
    limit: 3,
  });
  assert.deepEqual(ids, ['demo-b', 'demo-a', 'recent-1']);
});
