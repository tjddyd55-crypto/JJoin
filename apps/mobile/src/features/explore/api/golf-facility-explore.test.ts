import assert from 'node:assert/strict';
import test from 'node:test';
import { JoinStatus } from '@jjoin/types';
import { localDayKey } from '@jjoin/domain';
import { venueHasJoinableJoinToday } from './golf-facility-explore';
import type { ExploreVenueDto } from '@jjoin/types';

const venue = (overrides: Partial<ExploreVenueDto> = {}): ExploreVenueDto =>
  ({
    venueId: 'v1',
    name: 'Test',
    latitude: 37.5,
    longitude: 127,
    joinPreviews: [],
    source: 'GOLF_FACILITY',
    canCreateJoin: true,
    ...overrides,
  }) as ExploreVenueDto;

test('venueHasJoinableJoinToday accepts OPEN join today', () => {
  const today = new Date();
  const todayKey = localDayKey(today);
  const ok = venueHasJoinableJoinToday(
    venue({
      joinPreviews: [
        {
          joinId: 'j1',
          status: JoinStatus.OPEN,
          startAt: `${todayKey}T18:00:00+09:00`,
          scheduledEndAt: `${todayKey}T20:00:00+09:00`,
          currentParticipants: 1,
          maxParticipants: 4,
          rewardCoin: '0',
          hostNickname: 'host',
          hostVerified: true,
        },
      ],
    }),
    today,
  );
  assert.equal(ok, true);
});

test('venueHasJoinableJoinToday rejects FULL-only facilities', () => {
  const today = new Date();
  const todayKey = localDayKey(today);
  const ok = venueHasJoinableJoinToday(
    venue({
      joinPreviews: [
        {
          joinId: 'j1',
          status: JoinStatus.FULL,
          startAt: `${todayKey}T18:00:00+09:00`,
          scheduledEndAt: `${todayKey}T20:00:00+09:00`,
          currentParticipants: 4,
          maxParticipants: 4,
          rewardCoin: '0',
          hostNickname: 'host',
          hostVerified: true,
        },
      ],
    }),
    today,
  );
  assert.equal(ok, false);
});
