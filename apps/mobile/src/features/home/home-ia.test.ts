import assert from 'node:assert/strict';
import test from 'node:test';
import { createDefaultDiscoveryFilter } from '@jjoin/domain';

test('Home track CTA targets explore with a pre-locked venueType', () => {
  const field = { pathname: '/(tabs)/joins', params: { venueType: 'FIELD' } };
  const screen = { pathname: '/(tabs)/joins', params: { venueType: 'SCREEN' } };
  assert.equal(field.params.venueType, 'FIELD');
  assert.equal(screen.params.venueType, 'SCREEN');
  assert.equal(createDefaultDiscoveryFilter().venueType, 'SCREEN');
});

test('quick menu no longer owns create; track owns list+create', () => {
  const quickMenuLabels = ['조인 찾기', '쪼인몰', '스크린', '스크린 매장', '내 조인', '골프친구', '알림', '코인'];
  assert.equal(quickMenuLabels.includes('조인 만들기'), false);
  assert.equal(quickMenuLabels.includes('동호회'), false);
});
