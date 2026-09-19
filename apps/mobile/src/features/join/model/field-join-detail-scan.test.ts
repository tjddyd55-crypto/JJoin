import assert from 'node:assert/strict';
import test from 'node:test';
import { buildFieldJoinScanRows, fieldJoinScanLabels } from './field-join-detail-scan';
import type { JoinDetailDto } from '@jjoin/types';

function fieldDetail(overrides: Partial<JoinDetailDto> = {}): JoinDetailDto {
  return {
    joinId: 'j1',
    status: 'OPEN',
    joinMethod: 'APPROVAL',
    sportCode: 'SCREEN_GOLF',
    title: '필드 조인',
    description: null,
    startAt: '2026-09-20T01:00:00.000Z',
    scheduledEndAt: '2026-09-20T06:00:00.000Z',
    plannedPlayerCount: 4,
    confirmedPlayerCount: 1,
    availableSlots: 3,
    rewardPerParticipant: '0',
    recruitCount: 3,
    venue: {
      venueId: 'v1',
      name: '라데나골프클럽',
      address: '경기 가평',
      venueType: 'FIELD',
    },
    fieldDetails: {
      greenFeePerPerson: 90000,
      benefitGreenFee: false,
      benefitCart: false,
      benefitCaddie: false,
    },
    targetMaleCount: null,
    targetFemaleCount: null,
    minAge: null,
    maxAge: null,
    ...overrides,
  } as JoinDetailDto;
}

test('FIELD detail scan is the 10 core rows in product order', () => {
  assert.deepEqual([...fieldJoinScanLabels()], [
    '골프장',
    '날짜',
    '티타임',
    '그린피',
    '모집',
    '성별',
    '나이',
    '혜택',
    '코인',
    '방장 메모',
  ]);
  const rows = buildFieldJoinScanRows(fieldDetail());
  assert.deepEqual(
    rows.map((row) => row.label),
    [...fieldJoinScanLabels()],
  );
  assert.equal(rows.find((row) => row.label === '골프장')?.value, '라데나골프클럽');
  assert.equal(rows.find((row) => row.label === '그린피')?.value, '그린피 90,000원');
  assert.equal(rows.find((row) => row.label === '모집')?.value, '3명');
  assert.equal(rows.find((row) => row.label === '성별')?.value, '무관');
  assert.equal(rows.find((row) => row.label === '나이')?.value, '연령 무관');
  assert.equal(rows.find((row) => row.label === '혜택')?.value, '없음');
  assert.equal(rows.find((row) => row.label === '코인')?.value, '없음');
  assert.equal(rows.find((row) => row.label === '방장 메모')?.value, '없음');
  assert.equal(rows.some((row) => row.label === '홀'), false);
  assert.equal(rows.some((row) => /카트비|캐디비|예상/.test(row.value)), false);
});

test('FIELD detail scan shows optional conditions and Coin without inventing amounts', () => {
  const rows = buildFieldJoinScanRows(
    fieldDetail({
      description: '초보 환영',
      rewardPerParticipant: '500',
      targetMaleCount: 2,
      targetFemaleCount: 1,
      minAge: 30,
      maxAge: 49,
      fieldDetails: {
        greenFeePerPerson: 0,
        benefitGreenFee: true,
        benefitCart: true,
        benefitCaddie: false,
      } as JoinDetailDto['fieldDetails'],
    }),
  );
  assert.equal(rows.find((row) => row.label === '그린피')?.value, '그린피 0원');
  assert.equal(rows.find((row) => row.label === '성별')?.value, '남 2 / 여 1');
  assert.equal(rows.find((row) => row.label === '나이')?.value, '30세 ~ 49세');
  assert.equal(rows.find((row) => row.label === '혜택')?.value, '그린피 지원 · 카트 지원');
  assert.equal(rows.find((row) => row.label === '코인')?.value, '+500C');
  assert.equal(rows.find((row) => row.label === '방장 메모')?.value, '초보 환영');
});
