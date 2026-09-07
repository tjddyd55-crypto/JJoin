import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildDiscoverRegionApiQuery,
  createDefaultDiscoveryFilter,
  isJoinVisibleInDiscoveryList,
  resolveDiscoverCanJoin,
} from '@jjoin/domain';
import { JoinStatus } from '@jjoin/types';

test('region leaf discover query uses district filter only', () => {
  const query = buildDiscoverRegionApiQuery({
    region: {
      mode: 'DISTRICT',
      sido: '경기도',
      sigungu: '일산동구',
      label: '일산동구',
    },
  });
  assert.equal('error' in query, false);
  if (!('error' in query)) {
    assert.equal(query.regionMode, 'DISTRICT');
    assert.equal(query.sido, '경기도');
    assert.equal(query.sigungu, '일산동구');
  }
});

test('host-owned join remains visible in JOINABLE discovery', () => {
  const host = resolveDiscoverCanJoin({
    status: JoinStatus.OPEN,
    currentParticipants: 1,
    maxParticipants: 4,
    isHost: true,
    isParticipant: false,
  });
  assert.equal(
    isJoinVisibleInDiscoveryList({
      joinability: 'JOINABLE',
      canJoin: host.canJoin,
      canJoinState: host.state,
    }),
    true,
  );
});

test('createDefaultDiscoveryFilter does not require nearby location', () => {
  const filter = createDefaultDiscoveryFilter();
  const query = buildDiscoverRegionApiQuery({ region: filter.region });
  assert.equal('error' in query, false);
});
