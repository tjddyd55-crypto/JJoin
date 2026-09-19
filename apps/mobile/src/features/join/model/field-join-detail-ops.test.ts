import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FIELD_JOIN_DETAIL_OPS_ORDER,
  formatFieldConfirmedMemberSectionTitle,
  isFieldJoinDetail,
  listFieldApplicants,
  listFieldConfirmedMembers,
  resolveFieldDetailStickyScrollExtra,
  shouldShowJoinTeamAssignmentSection,
  shouldShowJoinUrgentRecruitToggle,
} from './field-join-detail-ops';
import { ParticipantRole, ParticipationStatus, type JoinParticipantDto } from '@jjoin/types';

function participant(
  overrides: Partial<JoinParticipantDto> & Pick<JoinParticipantDto, 'participantId' | 'role' | 'participationStatus'>,
): JoinParticipantDto {
  return {
    userId: overrides.userId ?? overrides.participantId,
    nickname: overrides.nickname ?? '멤버',
    verifiedBadge: true,
    appliedAt: '2026-09-19T00:00:00.000Z',
    approvedAt: null,
    ...overrides,
  } as JoinParticipantDto;
}

test('FIELD ops section order is core → members → applicants → host → chat', () => {
  assert.deepEqual([...FIELD_JOIN_DETAIL_OPS_ORDER], [
    'core',
    'confirmed_members',
    'applicants',
    'host_management',
    'chat',
  ]);
});

test('FIELD hides team assignment even when playFormat is TEAM', () => {
  assert.equal(
    shouldShowJoinTeamAssignmentSection({
      venue: { venueType: 'FIELD' },
      playFormat: 'TEAM',
      teamCount: 2,
    }),
    false,
  );
  assert.equal(
    shouldShowJoinTeamAssignmentSection({
      venue: { venueType: 'SCREEN' },
      playFormat: 'TEAM',
      teamCount: 2,
    }),
    true,
  );
});

test('FIELD hides urgent recruit toggle for hosts', () => {
  assert.equal(
    shouldShowJoinUrgentRecruitToggle({
      venueType: 'FIELD',
      isHost: true,
      canManage: true,
    }),
    false,
  );
  assert.equal(
    shouldShowJoinUrgentRecruitToggle({
      venueType: 'SCREEN',
      isHost: true,
      canManage: true,
    }),
    true,
  );
});

test('isFieldJoinDetail uses venueType only', () => {
  assert.equal(isFieldJoinDetail({ venue: { venueType: 'FIELD' } as never }), true);
  assert.equal(isFieldJoinDetail({ venue: { venueType: 'SCREEN' } as never }), false);
});

test('confirmed member title is recruit-centric and excludes host from the count', () => {
  const title = formatFieldConfirmedMemberSectionTitle({
    recruitCount: 3,
    participants: [
      { role: 'HOST', participationStatus: 'CONFIRMED' },
      { role: 'PARTICIPANT', participationStatus: 'APPROVED' },
      { role: 'PARTICIPANT', participationStatus: 'APPLIED' },
    ],
  });
  assert.equal(title, '모집 3명 중 1명 확정');
});

test('listFieldConfirmedMembers includes host and confirmed guests only', () => {
  const rows = listFieldConfirmedMembers([
    participant({
      participantId: 'h',
      role: ParticipantRole.HOST,
      participationStatus: ParticipationStatus.CONFIRMED,
    }),
    participant({
      participantId: 'a',
      role: ParticipantRole.PARTICIPANT,
      participationStatus: ParticipationStatus.APPROVED,
    }),
    participant({
      participantId: 'p',
      role: ParticipantRole.PARTICIPANT,
      participationStatus: ParticipationStatus.APPLIED,
    }),
  ]);
  assert.deepEqual(
    rows.map((row) => row.participantId),
    ['h', 'a'],
  );
});

test('listFieldApplicants keeps APPLIED guests including on-hold', () => {
  const rows = listFieldApplicants([
    participant({
      participantId: 'p',
      role: ParticipantRole.PARTICIPANT,
      participationStatus: ParticipationStatus.APPLIED,
      hostReviewStatus: 'ON_HOLD',
    }),
    participant({
      participantId: 'h',
      role: ParticipantRole.HOST,
      participationStatus: ParticipationStatus.CONFIRMED,
    }),
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.participantId, 'p');
});

test('FIELD sticky scroll extra covers apply note and secondary CTA', () => {
  assert.equal(
    resolveFieldDetailStickyScrollExtra({
      showApplyNote: true,
      showSecondaryCta: true,
      secondaryButtonExtra: 64,
    }),
    152,
  );
  assert.equal(
    resolveFieldDetailStickyScrollExtra({
      showApplyNote: false,
      showSecondaryCta: false,
      secondaryButtonExtra: 64,
    }),
    0,
  );
});
