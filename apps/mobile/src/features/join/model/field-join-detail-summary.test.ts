import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FIELD_DETAIL_AGE_ANY,
  FIELD_DETAIL_EMPTY_BENEFITS,
  FIELD_DETAIL_EMPTY_MEMO,
  FIELD_DETAIL_GENDER_ANY,
  FIELD_DETAIL_GREEN_FEE_MISSING,
  FIELD_DETAIL_SECTION_TITLES,
  buildFieldJoinDetailSummary,
} from './field-join-detail-summary';
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
      address: '경기도 가평군 가평읍 호반로 1',
      venueType: 'FIELD',
      sido: '경기도',
      sigungu: '가평군',
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

function flattenSummaryValues(summary: ReturnType<typeof buildFieldJoinDetailSummary>): string[] {
  return [
    summary.rounding.location,
    summary.rounding.date,
    summary.rounding.teeTime,
    summary.rounding.greenFee,
    summary.recruit.count,
    summary.recruit.gender,
    summary.recruit.age,
    ...summary.benefits.selected,
    summary.benefits.emptyMessage ?? '',
    summary.benefits.coinBadge ?? '',
    summary.memo.body ?? '',
    summary.memo.emptyMessage ?? '',
  ];
}

test('FIELD detail summary uses four section titles and no course-name row', () => {
  assert.deepEqual([...FIELD_DETAIL_SECTION_TITLES], [
    '라운딩 정보',
    '모집 조건',
    '참가자 혜택',
    '방장 메모',
  ]);

  const summary = buildFieldJoinDetailSummary(fieldDetail());
  assert.equal(summary.rounding.location, '경기 가평군');
  assert.equal(summary.rounding.greenFee, '90,000원');
  assert.equal(summary.recruit.count, '3명');
  assert.equal(summary.recruit.gender, FIELD_DETAIL_GENDER_ANY);
  assert.equal(summary.recruit.age, FIELD_DETAIL_AGE_ANY);
  assert.deepEqual(summary.benefits.selected, []);
  assert.equal(summary.benefits.emptyMessage, FIELD_DETAIL_EMPTY_BENEFITS);
  assert.equal(summary.benefits.coinBadge, null);
  assert.equal(summary.memo.body, null);
  assert.equal(summary.memo.emptyMessage, FIELD_DETAIL_EMPTY_MEMO);
  assert.equal(flattenSummaryValues(summary).includes('라데나골프클럽'), false);
  assert.equal(
    flattenSummaryValues(summary).some((value) => /카트비|캐디비|예상/.test(value)),
    false,
  );
});

test('FIELD detail summary falls back to short address and missing green fee', () => {
  const summary = buildFieldJoinDetailSummary(
    fieldDetail({
      venue: {
        venueId: 'v1',
        name: '라데나골프클럽',
        address: '강원 춘천시 남산면 한길로 10',
        venueType: 'FIELD',
      } as JoinDetailDto['venue'],
      fieldDetails: {
        greenFeePerPerson: null,
        benefitGreenFee: false,
        benefitCart: false,
        benefitCaddie: false,
      } as JoinDetailDto['fieldDetails'],
    }),
  );
  assert.equal(summary.rounding.location, '강원 춘천시 남산면');
  assert.equal(summary.rounding.greenFee, FIELD_DETAIL_GREEN_FEE_MISSING);
  assert.equal(summary.rounding.location.includes('라데나골프클럽'), false);
});

test('FIELD detail summary shows selected benefits, Coin badge, and memo body', () => {
  const summary = buildFieldJoinDetailSummary(
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
  assert.equal(summary.rounding.greenFee, '0원');
  assert.equal(summary.recruit.gender, '남 2 / 여 1');
  assert.equal(summary.recruit.age, '30세 ~ 49세');
  assert.deepEqual(summary.benefits.selected, ['그린피 지원', '카트 지원']);
  assert.equal(summary.benefits.emptyMessage, null);
  assert.equal(summary.benefits.coinBadge, '+500 Coin');
  assert.equal(summary.memo.body, '초보 환영');
  assert.equal(summary.memo.emptyMessage, null);
  assert.equal(summary.benefits.coinBadge?.includes('원'), false);
});
