import assert from 'node:assert/strict';
import { test } from 'node:test';
import { JoinStatus } from '@jjoin/types';
import {
  formatJoinScheduleListLabel,
  resolveJoinListStatusBadges,
  splitJoinCapacityDisplay,
  formatJoinScheduleDetailDate,
  formatJoinRewardTileValue,
  resolveJoinDisplayTitle,
} from './join-display';

test('formatJoinScheduleListLabel uses today label', () => {
  const label = formatJoinScheduleListLabel(
    '2026-09-17T10:00:00.000Z',
    new Date('2026-09-17T03:00:00.000Z'),
  );
  assert.match(label, /^오늘 ·/);
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

test('formatJoinRewardTileValue prefixes plus for coin', () => {
  const label = formatJoinRewardTileValue('300');
  assert.ok(label?.startsWith('+'));
});
