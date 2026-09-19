import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildFieldJoinMemberCardModel,
  formatFieldJoinMemberAgeLabel,
  resolveFieldJoinMemberActionInput,
} from './field-join-member-card';
import { ParticipantRole, ParticipationStatus, type JoinParticipantDto } from '@jjoin/types';

function member(overrides: Partial<JoinParticipantDto> = {}): JoinParticipantDto {
  return {
    participantId: 'p1',
    userId: 'u1',
    role: ParticipantRole.PARTICIPANT,
    participationStatus: ParticipationStatus.APPROVED,
    nickname: '라운더',
    verifiedBadge: true,
    appliedAt: '2026-09-19T00:00:00.000Z',
    approvedAt: '2026-09-19T01:00:00.000Z',
    ...overrides,
  } as JoinParticipantDto;
}

test('age label uses 세 and never invents a birth year', () => {
  assert.equal(formatFieldJoinMemberAgeLabel(46), '46세');
  assert.equal(formatFieldJoinMemberAgeLabel(null, 'FORTIES'), '40대');
  assert.equal(formatFieldJoinMemberAgeLabel(null, null), null);
  assert.doesNotMatch(formatFieldJoinMemberAgeLabel(46) ?? '', /년생|birth/i);
});

test('member card reuses existing profile fields in judgment priority', () => {
  const model = buildFieldJoinMemberCardModel(
    member({
      role: ParticipantRole.HOST,
      avatarUrl: 'https://cdn.example/a.jpg',
      age: 46,
      gender: 'MALE',
      fieldHandicap: 12,
      screenHandicap: 8,
      completedJoinCount: 11,
      attendanceRatePercent: 95,
      noShowCount: 0,
    }),
  );
  assert.equal(model.avatarUrl, 'https://cdn.example/a.jpg');
  assert.equal(model.nickname, '라운더');
  assert.equal(model.roleBadge, '방장');
  assert.equal(model.identityLine, '46세 · 남성');
  assert.deepEqual(model.metrics, [
    '필드 핸디 12',
    '스크린 핸디 8',
    '참석 11회',
    '출석 95%',
    '매우 안정적',
  ]);
  assert.equal(model.metrics.some((item) => item.includes('경력')), false);
});

test('member card omits unavailable fields instead of inventing them', () => {
  const model = buildFieldJoinMemberCardModel(
    member({
      age: undefined,
      gender: 'UNSPECIFIED',
      fieldHandicap: undefined,
      screenHandicap: undefined,
      avgScore: undefined,
      completedJoinCount: undefined,
      attendanceRatePercent: undefined,
      applicationNote: '  초보 환영  ',
      fieldGenderHint: '조건 일치',
    }),
  );
  assert.equal(model.identityLine, null);
  assert.deepEqual(model.metrics, []);
  assert.equal(model.applicationNote, '초보 환영');
  assert.equal(model.conditionHint, '조건 일치');
  assert.equal(model.roleBadge, '참가자');
});

test('gender is localized and never shown as raw MALE', () => {
  const model = buildFieldJoinMemberCardModel(member({ gender: 'FEMALE', age: 30 }));
  assert.equal(model.genderLabel, '여성');
  assert.equal(model.identityLine?.includes('MALE'), false);
  assert.equal(model.identityLine?.includes('FEMALE'), false);
});

test('avgScore is shown only when the existing placeholder field is present', () => {
  const withAvg = buildFieldJoinMemberCardModel(member({ fieldHandicap: 12, avgScore: 88 }));
  assert.deepEqual(withAvg.metrics.slice(0, 2), ['필드 핸디 12', '평균타 88']);
  const withoutAvg = buildFieldJoinMemberCardModel(member({ fieldHandicap: 12, avgScore: null }));
  assert.equal(withoutAvg.metrics.some((item) => item.includes('평균타')), false);
});

test('member actions hide message and gift on own profile', () => {
  assert.equal(
    resolveFieldJoinMemberActionInput({
      targetUserId: 'u1',
      nickname: '나',
      viewerUserId: 'u1',
    }),
    null,
  );
  const other = resolveFieldJoinMemberActionInput({
    targetUserId: 'u2',
    nickname: '상대',
    viewerUserId: 'u1',
  });
  assert.deepEqual(other, {
    targetUserId: 'u2',
    nickname: '상대',
    viewerUserId: 'u1',
    coinGiftEnabled: true,
    messagingEnabled: true,
  });
});

test('member actions honor feature flags without inventing DM or gift logic', () => {
  const hidden = resolveFieldJoinMemberActionInput({
    targetUserId: 'u2',
    nickname: '상대',
    viewerUserId: 'u1',
    coinGiftEnabled: false,
    messagingEnabled: false,
  });
  assert.equal(hidden?.coinGiftEnabled, false);
  assert.equal(hidden?.messagingEnabled, false);
});
