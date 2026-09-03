import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JoinStatus, JoinMethod, type JoinDetailDto } from '@jjoin/types';
import { resolveJoinDetailPrimaryCta } from './join-detail-cta';

const baseDetail: JoinDetailDto = {
  joinId: 'j1',
  status: JoinStatus.OPEN,
  joinMethod: JoinMethod.OPEN,
  sportCode: 'SCREEN_GOLF',
  title: '테스트',
  description: null,
  startAt: '2026-12-01T10:00:00.000Z',
  scheduledEndAt: '2026-12-01T14:00:00.000Z',
  plannedPlayerCount: 4,
  confirmedPlayerCount: 1,
  availableSlots: 3,
  rewardPerParticipant: '100',
  roomCreationFeeAmount: '0',
  rewardHoldTotalAmount: '0',
  coinAccountingPending: false,
  venue: {
    venueId: 'v1',
    provider: 'KAKAO',
    providerPlaceId: 'p1',
    name: '테스트 매장',
    address: '주소',
    regionLabel: '고현동',
    latitude: 1,
    longitude: 2,
  },
  host: {
    id: 'h1',
    nickname: '호스트',
    verifiedBadge: false,
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
};

test('resolveJoinDetailPrimaryCta returns apply for open join', () => {
  const cta = resolveJoinDetailPrimaryCta({
    detail: baseDetail,
    isHost: false,
    canLeave: false,
  });
  assert.equal(cta.label, '참가 신청');
  assert.equal(cta.disabled, false);
});

test('resolveJoinDetailPrimaryCta returns host manage label', () => {
  const cta = resolveJoinDetailPrimaryCta({
    detail: baseDetail,
    isHost: true,
    canLeave: false,
  });
  assert.equal(cta.label, '조인 관리');
  assert.equal(cta.disabled, true);
});
