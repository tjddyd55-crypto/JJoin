import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isJoinDetailDevPanelEnabled } from './join-detail-dev-tools';

test('join detail dev panel is disabled by default', () => {
  const prev = process.env.EXPO_PUBLIC_JOIN_DETAIL_DEV_PANEL;
  delete process.env.EXPO_PUBLIC_JOIN_DETAIL_DEV_PANEL;
  assert.equal(isJoinDetailDevPanelEnabled(), false);
  process.env.EXPO_PUBLIC_JOIN_DETAIL_DEV_PANEL = '1';
  assert.equal(isJoinDetailDevPanelEnabled(), true);
  if (prev === undefined) delete process.env.EXPO_PUBLIC_JOIN_DETAIL_DEV_PANEL;
  else process.env.EXPO_PUBLIC_JOIN_DETAIL_DEV_PANEL = prev;
});
