import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ParticipationStatus, ParticipantRole } from '@jjoin/types';
import {
  buildJoinParticipationSummary,
  buildJoinRecruitmentBreakdown,
  buildJoinRecruitmentStatTiles,
  filterJoinDisplayParticipants,
  hasJoinBenefits,
} from './join-detail-display';

test('filterJoinDisplayParticipants excludes host', () => {
  const filtered = filterJoinDisplayParticipants([
    {
      participantId: 'h1',
      userId: 'u1',
      role: ParticipantRole.HOST,
      participationStatus: ParticipationStatus.APPROVED,
      nickname: '방장',
      verifiedBadge: true,
      appliedAt: '2026-01-01T00:00:00.000Z',
      approvedAt: null,
    },
    {
      participantId: 'p1',
      userId: 'u2',
      role: ParticipantRole.PARTICIPANT,
      participationStatus: ParticipationStatus.APPLIED,
      nickname: '참가자',
      verifiedBadge: true,
      appliedAt: '2026-01-01T00:00:00.000Z',
      approvedAt: null,
    },
  ]);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].nickname, '참가자');
});

test('buildJoinRecruitmentBreakdown separates targets from confirmed counts', () => {
  const breakdown = buildJoinRecruitmentBreakdown({
    joinId: 'j1',
    status: 'OPEN',
    joinMethod: 'OPEN',
    sportCode: 'SCREEN_GOLF',
    title: null,
    description: null,
    startAt: '2026-09-17T10:00:00.000Z',
    scheduledEndAt: '2026-09-17T14:00:00.000Z',
    plannedPlayerCount: 4,
    confirmedPlayerCount: 0,
    availableSlots: 4,
    rewardPerParticipant: '300',
    roomCreationFeeAmount: '0',
    rewardHoldTotalAmount: '0',
    coinAccountingPending: false,
    venue: {
      venueId: 'v1',
      provider: 'p',
      providerPlaceId: 'p1',
      name: '매장',
      address: null,
      regionLabel: null,
      latitude: 0,
      longitude: 0,
    },
    host: {
      id: 'h',
      nickname: '호스트',
      verifiedBadge: true,
      avatarUrl: null,
      genderDisplay: null,
      ageBand: null,
      regionLabel: null,
      bio: null,
      sportProfiles: [],
      participationCount: 0,
    },
    myParticipation: null,
    participants: [],
    targetMaleCount: 2,
    targetFemaleCount: 2,
    minimumPlayers: 2,
    recruitClosesAt: '2026-09-29T10:00:00.000Z',
  } as never);

  assert.equal(breakdown.totalLabel, '총 4명 모집');
  assert.equal(breakdown.maleTarget, 2);
  assert.equal(breakdown.femaleTarget, 2);
  assert.equal(breakdown.minimumPlayers, 2);
});

test('buildJoinParticipationSummary highlights last seat', () => {
  const summary = buildJoinParticipationSummary({
    plannedPlayerCount: 4,
    confirmedPlayerCount: 3,
    availableSlots: 1,
    targetMaleCount: 2,
    targetFemaleCount: 2,
    confirmedMaleCount: 2,
    confirmedFemaleCount: 1,
  } as never);
  assert.equal(summary.seatsHighlightTone, 'lastSeat');
  assert.equal(summary.seatsLeftLabel, '1자리 남음');
});

test('buildJoinRecruitmentStatTiles uses recruitment targets only', () => {
  const tiles = buildJoinRecruitmentStatTiles({
    plannedPlayerCount: 4,
    targetMaleCount: 2,
    targetFemaleCount: 2,
    minimumPlayers: 2,
    recruitClosesAt: '2026-09-29T10:00:00.000Z',
  } as never);
  assert.equal(tiles.find((t) => t.label === '총 모집')?.value, '4명');
  assert.equal(tiles.find((t) => t.label === '남성')?.value, '2명');
  assert.equal(tiles.find((t) => t.label === '여성')?.value, '2명');
  assert.equal(tiles.find((t) => t.label === '최소')?.value, '2명');
  assert.equal(tiles.some((t) => t.value.includes('/')), false);
});

test('hasJoinBenefits is false for zero reward', () => {
  assert.equal(
    hasJoinBenefits({
      rewardPerParticipant: '0',
      matchingRewardTarget: 'ALL',
    } as never),
    false,
  );
});
