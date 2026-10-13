import assert from 'node:assert/strict';
import test from 'node:test';
import { JoinDiscoveryService } from './join-discovery.service';

function row(id: string, status: string, startAt: string, scheduledEndAt: string) {
  return {
    id,
    title: null,
    status,
    joinKind: 'GENERAL',
    startAt: new Date(startAt),
    scheduledEndAt: new Date(scheduledEndAt),
    recruitClosesAt: null,
    minimumPlayers: null,
    targetMaleCount: null,
    targetFemaleCount: null,
    matchingRewardTarget: null,
    plannedPlayerCount: 4,
    confirmedPlayerCount: 2,
    confirmedAt: null,
    cancelledAt: null,
    rewardPerParticipant: '0',
    hostUserId: 'host',
    fieldDetail: null,
    venue: {
      id: 'v1',
      name: '테스트CC',
      region: '강원',
      latitude: '37.8',
      longitude: '127.7',
      venueType: 'FIELD',
      golfFacility: null,
      fieldGolfCourse: { id: 'f1', sido: '강원특별자치도', sigungu: '춘천시', holeCount: 18 },
    },
    host: { profile: { nickname: '호스트', avatarAsset: null } },
    participants: [],
  };
}

function makeService(now: Date) {
  const active = [row('active', 'OPEN', '2026-09-28T05:00:00.000Z', '2026-09-28T09:00:00.000Z')];
  const finished = [
    row('ended-open', 'OPEN', '2026-09-27T22:20:00.000Z', '2026-09-28T00:20:00.000Z'),
    row('completed', 'COMPLETED', '2026-09-27T21:00:00.000Z', '2026-09-27T23:00:00.000Z'),
  ];
  const calls: unknown[] = [];
  const prisma = {
    join: {
      findMany: async (args: { where: { OR?: unknown } }) => {
        calls.push(args.where);
        return args.where.OR ? finished : active;
      },
    },
  };
  const media = { resolveAvatarUrl: () => null };
  void now;
  return { service: new JoinDiscoveryService(prisma as never, media as never), calls };
}

test('discover without includeCompleted keeps legacy shape (no completed array)', async () => {
  const { service, calls } = makeService(new Date());
  const res = await service.discover('viewer', {
    date: '2026-09-28',
    regionMode: 'ALL',
    venueType: 'FIELD',
    joinability: 'ALL',
  });
  assert.equal(res.completed, undefined);
  assert.equal(calls.length, 1);
});

test('discover includeCompleted returns read-only 완료 cards, most recent end first', async () => {
  const { service } = makeService(new Date());
  const res = await service.discover('viewer', {
    date: '2026-09-28',
    regionMode: 'ALL',
    venueType: 'FIELD',
    joinability: 'JOINABLE',
    includeCompleted: true,
  });
  assert.ok(res.completed);
  assert.deepEqual(
    res.completed!.map((c) => c.joinId),
    ['ended-open', 'completed'],
  );
  for (const card of res.completed!) {
    assert.equal(card.isCompleted, true);
    assert.equal(card.canJoin, false);
    assert.equal(card.canJoinState, 'UNAVAILABLE');
    assert.equal(card.ctaLabel, null);
  }
});
