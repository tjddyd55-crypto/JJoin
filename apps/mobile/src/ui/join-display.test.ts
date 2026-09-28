import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JoinStatus } from '@jjoin/types';
import {
  baseJoinCardFields,
  formatJoinScheduleListLabel,
  resolveJoinListStatusBadges,
  splitJoinCapacityDisplay,
  formatJoinScheduleDetailDate,
  formatJoinRewardTileValue,
  resolveJoinDisplayTitle,
  formatJoinDisplayTitle,
  buildJoinCardRewardLabel,
} from './join-display';

test('formatJoinScheduleListLabel uses today label', () => {
  const label = formatJoinScheduleListLabel(
    '2026-09-17T10:00:00.000Z',
    new Date('2026-09-17T03:00:00.000Z'),
  );
  assert.match(label, /^오늘 ·/);
});

test('FIELD track badge does not reuse the SCREEN sport badge', () => {
  const field = resolveJoinListStatusBadges({
    status: JoinStatus.OPEN,
    sportCode: 'SCREEN_GOLF',
    venueType: 'FIELD',
  });
  assert.ok(field.some((b) => b.label === '필드'));
  assert.equal(field.some((b) => b.label === '스크린'), false);

  const screen = resolveJoinListStatusBadges({
    status: JoinStatus.OPEN,
    sportCode: 'SCREEN_GOLF',
    venueType: 'SCREEN',
  });
  assert.ok(screen.some((b) => b.label === '스크린'));
});

test('resolveJoinListStatusBadges includes urgent and last seat', () => {
  const badges = resolveJoinListStatusBadges({
    status: JoinStatus.OPEN,
    isUrgent: true,
    seatsLeft: 1,
  });
  assert.ok(badges.some((b) => b.label === '긴급 모집'));
  assert.ok(badges.some((b) => b.label === '마감 임박'));
});

test('formatJoinScheduleDetailDate uses parenthetical weekday', () => {
  const label = formatJoinScheduleDetailDate('2026-09-17T10:00:00.000Z');
  assert.match(label, /\(.*\)/);
});

test('resolveJoinDisplayTitle prefers title over venue', () => {
  assert.equal(
    resolveJoinDisplayTitle('거제 오션스크린', '오늘 저녁 라운드'),
    '오늘 저녁 라운드',
  );
});

test('formatJoinDisplayTitle maps bracket QA seed titles', () => {
  (globalThis as { __DEV__?: boolean }).__DEV__ = true;
  assert.equal(
    formatJoinDisplayTitle('[QA-STORE-DASH-RECOR-RECOMMEND] weekly wed 19'),
    '주말 저녁 스크린 라운드',
  );
});

test('formatJoinRewardTileValue prefixes plus for coin', () => {
  const label = formatJoinRewardTileValue('300');
  assert.ok(label?.startsWith('+'));
});

test('formatJoinRewardTileValue returns null for zero', () => {
  assert.equal(formatJoinRewardTileValue('0'), null);
});

test('buildJoinCardRewardLabel returns null for zero', () => {
  assert.equal(buildJoinCardRewardLabel('0'), null);
});

test('baseJoinCardFields maps FIELD cost and track badges without throwing', () => {
  const card = baseJoinCardFields(
    {
      startAt: '2026-09-17T10:00:00.000Z',
      status: JoinStatus.OPEN,
      venueName: '거제CC',
      venueType: 'FIELD',
      expectedCostKrw: 70_000,
      seatsLeft: 2,
    },
    { now: new Date('2026-09-17T03:00:00.000Z') },
  );
  assert.equal(card.costLabel, '그린피 70,000원');
  assert.ok(card.statusBadges?.some((badge) => badge.label === '필드'));
  assert.equal(card.statusBadges?.some((badge) => badge.label === '스크린'), false);
});

test('finished joins show 완료 status badge (end passed / SETTLING / COMPLETED); cancelled unchanged', () => {
  const now = new Date('2026-09-28T03:00:00.000Z');
  const labels = (input: Parameters<typeof resolveJoinListStatusBadges>[0]) =>
    resolveJoinListStatusBadges({ venueType: 'FIELD', now, ...input }).map((b) => b.label);
  const ended = labels({ status: JoinStatus.CONFIRMED, scheduledEndAt: '2026-09-28T02:00:00.000Z' });
  assert.ok(ended.includes('완료'));
  assert.equal(ended.includes('종료'), false);
  assert.ok(labels({ status: JoinStatus.SETTLING }).includes('완료'));
  assert.ok(labels({ status: JoinStatus.COMPLETED }).includes('완료'));
  assert.ok(labels({ status: JoinStatus.CANCELLED }).includes('취소'));
  assert.equal(labels({ status: JoinStatus.OPEN, scheduledEndAt: '2026-09-28T09:00:00.000Z' }).includes('완료'), false);
});
