import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildNotificationContent,
  buildNotificationEventKey,
  buildJoinUpdateOperationId,
  buildAndroidCollapseKey,
  formatUnreadBadge,
  isRecommendationNotificationType,
  isWithinQuietHours,
  isWithinScreenRadius,
  matchesFieldNotificationRegions,
  notificationInboxCategory,
  resolveDefaultFieldNotificationRegions,
  resolveEffectiveFieldNotificationRegions,
  resolveNotificationRoute,
  shouldExcludeHost,
  shouldRateLimitJoinCreated,
  DEFAULT_NOTIFICATION_PREFERENCES,
  DEFAULT_QUIET_HOURS,
  JOIN_CREATED_RATE_LIMIT,
  shouldDeliverPushForType,
} from './index';

test('resolveDefaultFieldNotificationRegions maps Seoul home to metro province', () => {
  const regions = resolveDefaultFieldNotificationRegions('서울 강남구');
  assert.deepEqual(regions, [{ province: '서울특별시', cityCounty: null }]);
});

test('resolveDefaultFieldNotificationRegions maps Gyeonggi city to 시/군', () => {
  const regions = resolveDefaultFieldNotificationRegions({
    sido: '경기도',
    sigungu: '용인시 수지구',
  });
  assert.deepEqual(regions, [{ province: '경기도', cityCounty: '용인시' }]);
});

test('resolveDefaultFieldNotificationRegions infers short city label', () => {
  const regions = resolveDefaultFieldNotificationRegions('거제');
  assert.equal(regions[0]?.province, '경상남도');
  assert.equal(regions[0]?.cityCounty, '거제시');
});

test('CUSTOM field regions freeze selection and AUTO follows home', () => {
  const custom = [{ province: '부산광역시', cityCounty: null }];
  assert.deepEqual(
    resolveEffectiveFieldNotificationRegions({
      mode: 'CUSTOM',
      customRegions: custom,
      homeRegion: '서울 마포구',
    }),
    custom,
  );
  assert.deepEqual(
    resolveEffectiveFieldNotificationRegions({
      mode: 'AUTO',
      customRegions: custom,
      homeRegion: '서울 마포구',
    }),
    [{ province: '서울특별시', cityCounty: null }],
  );
});

test('FIELD region match is province/city, not screen distance', () => {
  assert.equal(
    matchesFieldNotificationRegions({
      venueSido: '경기도',
      venueSigungu: '용인시 처인구',
      regions: [{ province: '경기도', cityCounty: '용인시' }],
    }),
    true,
  );
  assert.equal(
    matchesFieldNotificationRegions({
      venueSido: '경기도',
      venueSigungu: '성남시',
      regions: [{ province: '경기도', cityCounty: '용인시' }],
    }),
    false,
  );
});

test('SCREEN radius includes in-range and excludes out-of-range', () => {
  const venue = { latitude: 37.5, longitude: 127.03 };
  const inside = { latitude: 37.51, longitude: 127.04 };
  const far = { latitude: 37.8, longitude: 127.2 };
  assert.equal(
    isWithinScreenRadius({ user: inside, venue, mode: 'KM_15' }),
    true,
  );
  assert.equal(
    isWithinScreenRadius({ user: far, venue, mode: 'KM_5' }),
    false,
  );
});

test('SCREEN SAME_ADMIN_REGION matches stored home district', () => {
  assert.equal(
    isWithinScreenRadius({
      user: { latitude: 0, longitude: 0 },
      venue: { latitude: 0, longitude: 0 },
      mode: 'SAME_ADMIN_REGION',
      userSido: '서울특별시',
      userSigungu: '강남구',
      venueSido: '서울',
      venueSigungu: '강남구',
    }),
    true,
  );
});

test('host is excluded from JOIN_CREATED audience', () => {
  assert.equal(shouldExcludeHost('host-1', 'host-1'), true);
  assert.equal(shouldExcludeHost('user-2', 'host-1'), false);
});

test('formatter copy for spec events', () => {
  assert.equal(buildNotificationContent('JOIN_CREATED', { venueName: '스크린A' }).title, '근처 새 조인');
  assert.match(
    buildNotificationContent('DIRECT_MESSAGE_RECEIVED', {
      actorNickname: '민수',
      messagePreview: '안녕',
    }).body,
    /민수: 안녕/,
  );
  assert.match(
    buildNotificationContent('FRIEND_REQUEST_RECEIVED', { actorNickname: '민수' }).body,
    /민수/,
  );
  assert.equal(buildNotificationContent('JOIN_APPLICATION_APPROVED').title, '참가 승인');
  assert.equal(buildNotificationContent('CLUB_JOIN_REJECTED', { clubName: '클럽A' }).title, '동호회 가입 거절');
});

test('idempotency key includes messageId for DMs', () => {
  assert.equal(
    buildNotificationEventKey({
      type: 'DIRECT_MESSAGE_RECEIVED',
      recipientUserId: 'u1',
      targetEntityId: 'c1',
      messageId: 'm1',
    }),
    'DIRECT_MESSAGE_RECEIVED:u1:c1:m1',
  );
  assert.equal(
    buildNotificationEventKey({
      type: 'JOIN_CREATED',
      recipientUserId: 'u1',
      targetEntityId: 'j1',
    }),
    'JOIN_CREATED:u1:j1',
  );
});

test('JOIN_UPDATED same operation retry dedupes; distinct edits do not', () => {
  const previousUpdatedAt = '2026-09-20T03:00:00.000Z';
  const firstMutation = { title: '저녁 조인', description: '첫 수정' };
  const secondMutation = { title: '저녁 조인', description: '두번째 수정' };
  const firstOp = buildJoinUpdateOperationId({
    previousUpdatedAt,
    mutation: firstMutation,
  });
  const retryOp = buildJoinUpdateOperationId({
    previousUpdatedAt,
    mutation: { description: '첫 수정', title: '저녁 조인' },
  });
  const secondOp = buildJoinUpdateOperationId({
    previousUpdatedAt: '2026-09-20T03:10:00.000Z',
    mutation: secondMutation,
  });
  assert.equal(firstOp, retryOp);
  assert.notEqual(firstOp, secondOp);

  const recipient = 'u1';
  const joinId = 'j1';
  const firstKey = buildNotificationEventKey({
    type: 'JOIN_UPDATED',
    recipientUserId: recipient,
    targetEntityId: joinId,
    operationId: firstOp,
  });
  const retryKey = buildNotificationEventKey({
    type: 'JOIN_UPDATED',
    recipientUserId: recipient,
    targetEntityId: joinId,
    operationId: retryOp,
  });
  const secondKey = buildNotificationEventKey({
    type: 'JOIN_UPDATED',
    recipientUserId: recipient,
    targetEntityId: joinId,
    operationId: secondOp,
  });
  assert.equal(firstKey, retryKey);
  assert.notEqual(firstKey, secondKey);
  assert.match(firstKey, /^JOIN_UPDATED:u1:j1:/);
  assert.notEqual(
    firstKey,
    buildNotificationEventKey({
      type: 'JOIN_UPDATED',
      recipientUserId: recipient,
      targetEntityId: joinId,
    }),
  );

  const keys = new Set([firstKey, retryKey, secondKey]);
  assert.equal(keys.size, 2);
});

test('JOIN_CANCELLED stays join-scoped without operation id', () => {
  assert.equal(
    buildNotificationEventKey({
      type: 'JOIN_CANCELLED',
      recipientUserId: 'u1',
      targetEntityId: 'j1',
    }),
    'JOIN_CANCELLED:u1:j1',
  );
});

test('JOIN_CREATED rate limit is isolated from direct events', () => {
  assert.equal(JOIN_CREATED_RATE_LIMIT.maxPerRecipient, 8);
  assert.equal(shouldRateLimitJoinCreated(8), true);
  assert.equal(shouldRateLimitJoinCreated(7), false);
  assert.equal(isRecommendationNotificationType('JOIN_CREATED'), true);
  assert.equal(isRecommendationNotificationType('DIRECT_MESSAGE_RECEIVED'), false);
});

test('missing preference row uses domain defaults including JOIN_CREATED', () => {
  assert.equal(DEFAULT_NOTIFICATION_PREFERENCES.joinCreatedEnabled, true);
  assert.equal(
    shouldDeliverPushForType('JOIN_CREATED', DEFAULT_NOTIFICATION_PREFERENCES, true),
    true,
  );
  assert.equal(
    shouldDeliverPushForType(
      'JOIN_CREATED',
      { ...DEFAULT_NOTIFICATION_PREFERENCES, joinCreatedEnabled: false },
      true,
    ),
    false,
  );
});

test('tap routing SSOT for spec types', () => {
  assert.deepEqual(
    resolveNotificationRoute({
      type: 'JOIN_CREATED',
      data: { joinId: '11111111-1111-4111-8111-111111111111' },
    }),
    { kind: 'join', joinId: '11111111-1111-4111-8111-111111111111' },
  );
  assert.deepEqual(
    resolveNotificationRoute({
      type: 'CLUB_JOIN_REJECTED',
      data: { clubId: '22222222-2222-4222-8222-222222222222' },
    }),
    { kind: 'club', clubId: '22222222-2222-4222-8222-222222222222' },
  );
  assert.equal(notificationInboxCategory('DIRECT_MESSAGE_RECEIVED'), 'message');
  assert.equal(notificationInboxCategory('JOIN_CREATED'), 'join');
  assert.equal(notificationInboxCategory('ATTENDANCE_REWARD'), 'settlement');
  assert.deepEqual(resolveNotificationRoute({ type: 'ATTENDANCE_REWARD', data: {} }), {
    kind: 'rewards',
  });
  assert.deepEqual(resolveNotificationRoute({ type: 'ACHIEVEMENT_REWARD', data: {} }), {
    kind: 'rewards',
  });
  assert.equal(buildNotificationContent('ATTENDANCE_REWARD', { rewardAmount: '1', currentStreak: 2 }).title, '오늘 출석 완료');
  assert.match(
    buildNotificationContent('ACHIEVEMENT_REWARD', {
      achievementKind: 'HOST_MILESTONE',
      milestoneThreshold: 5,
      rewardAmount: '10',
    }).body,
    /5회 성사/,
  );
  assert.equal(formatUnreadBadge(0), '');
  assert.equal(formatUnreadBadge(12), '12');
  assert.equal(formatUnreadBadge(120), '99+');
});

test('quiet hours helper is structured but disabled by default', () => {
  assert.equal(isWithinQuietHours(DEFAULT_QUIET_HOURS, 23 * 60), false);
  assert.equal(
    isWithinQuietHours({ enabled: true, startMinutes: 22 * 60, endMinutes: 7 * 60 }, 23 * 60),
    true,
  );
});

test('Android collapse key groups messages by conversation', () => {
  assert.equal(buildAndroidCollapseKey('DIRECT_MESSAGE_RECEIVED', 'conv-1'), 'dm:conv-1');
});
