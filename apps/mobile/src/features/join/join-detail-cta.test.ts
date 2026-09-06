import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JoinStatus, JoinMethod, ParticipationStatus, ParticipantRole, type JoinDetailDto } from '@jjoin/types';
import {
  joinDetailCtaButtonVariant,
  resolveJoinDetailPrimaryCta,
  shouldShowJoinDetailStickyCta,
} from './join-detail-cta';

const baseDetail: JoinDetailDto = {
  joinId: 'j1',
  status: JoinStatus.OPEN,
  joinMethod: JoinMethod.OPEN,
  sportCode: 'SCREEN_GOLF',
  title: '테스트 조인',
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
  assert.equal(cta.presentation, 'apply');
  assert.equal(joinDetailCtaButtonVariant(cta.presentation), 'primary');
});

test('resolveJoinDetailPrimaryCta hides sticky for host viewers', () => {
  const cta = resolveJoinDetailPrimaryCta({
    detail: baseDetail,
    isHost: true,
    canLeave: false,
  });
  assert.equal(cta.presentation, 'host');
  assert.equal(shouldShowJoinDetailStickyCta(cta.presentation), false);
});

test('waitlist available shows 대기 신청', () => {
  const cta = resolveJoinDetailPrimaryCta({
    detail: {
      ...baseDetail,
      status: JoinStatus.FULL,
      availableSlots: 0,
      waitlistAvailable: true,
    },
    isHost: false,
    canLeave: false,
  });
  assert.equal(cta.presentation, 'waitlist');
  assert.equal(cta.label, '대기 신청');
});

test('WAITLISTED shows position', () => {
  const cta = resolveJoinDetailPrimaryCta({
    detail: {
      ...baseDetail,
      myParticipation: {
        participantId: 'p1',
        userId: 'u1',
        role: ParticipantRole.PARTICIPANT,
        participationStatus: ParticipationStatus.WAITLISTED,
        nickname: '나',
        verifiedBadge: false,
        appliedAt: '2026-01-01T00:00:00Z',
        approvedAt: null,
        waitlistPosition: 2,
      },
    },
    isHost: false,
    canLeave: false,
  });
  assert.equal(cta.presentation, 'waitlisted');
  assert.equal(cta.label, '대기 2번');
});

test('OFFERED shows accept CTA', () => {
  const cta = resolveJoinDetailPrimaryCta({
    detail: {
      ...baseDetail,
      myParticipation: {
        participantId: 'p1',
        userId: 'u1',
        role: ParticipantRole.PARTICIPANT,
        participationStatus: ParticipationStatus.OFFERED,
        nickname: '나',
        verifiedBadge: false,
        appliedAt: '2026-01-01T00:00:00Z',
        approvedAt: null,
        offerExpiresAt: '2026-12-01T10:30:00.000Z',
      },
    },
    isHost: false,
    canLeave: false,
    now: new Date('2026-12-01T10:05:00.000Z'),
  });
  assert.equal(cta.presentation, 'waitlist_offer');
  assert.match(cta.label, /자리가 났어요/);
});
