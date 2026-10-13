/**
 * Golf friends + join member preference contract tests (no Nest/Prisma).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import {
  hasJoinMemberPreferences,
  validateJoinMemberPreferences,
} from '@jjoin/domain';
import { GolfFriendRelationship, JoinPreferredGender } from '@jjoin/types';

test('DEV recommended list pins investor-demo personas for any viewer', () => {
  const source = readFileSync(
    join(process.cwd(), 'src/modules/engagement/golf-friends.service.ts'),
    'utf8',
  );
  assert.match(source, /isDevelopmentUnsafePathAllowed/);
  assert.match(source, /mergeDevDemoRecommendedUserIds/);
  assert.match(source, /DEV_INVESTOR_DEMO_KEY_MARKER/);
  assert.doesNotMatch(source, /investor flag|ADMIN_USER_IDS|viewerId === '/);
});

test('GolfFriendRelationship covers lifecycle states', () => {
  assert.deepEqual(
    Object.values(GolfFriendRelationship).sort(),
    ['FRIENDS', 'NONE', 'RECEIVED', 'REQUESTED'].sort(),
  );
});

test('join member preferences validate age range', () => {
  const ok = validateJoinMemberPreferences({
    preferredGender: JoinPreferredGender.FEMALE,
    minAge: 30,
    maxAge: 45,
  });
  assert.equal(ok.ok, true);
  assert.equal(
    hasJoinMemberPreferences({
      preferredGender: JoinPreferredGender.FEMALE,
      minAge: 30,
      maxAge: 45,
    }),
    true,
  );
});

test('join member preferences reject inverted range', () => {
  const bad = validateJoinMemberPreferences({ minAge: 50, maxAge: 30 });
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.equal(bad.code, 'invalid_age_range');
});
