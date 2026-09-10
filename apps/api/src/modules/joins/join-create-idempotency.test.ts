import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  findJoinIdByClientIdempotencyKey,
  lookupJoinCreateCoinIdempotencyKeys,
  writeJoinCreateCoinIdempotencyKey,
} from './join-create-idempotency';

test('host-scopes client-keyed coin writes so different hosts do not share a ledger key', () => {
  const a = writeJoinCreateCoinIdempotencyKey('standard', 'reward-hold', 'host-a', 'client-key', true);
  const b = writeJoinCreateCoinIdempotencyKey('standard', 'reward-hold', 'host-b', 'client-key', true);
  assert.equal(a, 'join:host-a:client-key:reward-hold');
  assert.equal(b, 'join:host-b:client-key:reward-hold');
  assert.notEqual(a, b);
});

test('keeps joinId-based coin keys when the client sent no idempotency key', () => {
  assert.equal(
    writeJoinCreateCoinIdempotencyKey('standard', 'room-fee', 'host-a', 'join-uuid', false),
    'join:join-uuid:room-fee',
  );
  assert.equal(
    writeJoinCreateCoinIdempotencyKey('store_matching', 'reward-hold', 'host-a', 'join-uuid', false),
    'store-join:join-uuid:reward-hold',
  );
});

test('lookup lists host-scoped keys before legacy global keys', () => {
  assert.deepEqual(lookupJoinCreateCoinIdempotencyKeys('standard', 'host-a', 'k1'), [
    'join:host-a:k1:room-fee',
    'join:host-a:k1:reward-hold',
    'join:k1:room-fee',
    'join:k1:reward-hold',
  ]);
  assert.deepEqual(lookupJoinCreateCoinIdempotencyKeys('store_matching', 'host-a', 'k1'), [
    'store-join:host-a:k1:reward-hold',
    'store-join:k1:reward-hold',
  ]);
});

test('coin ledger lookup ignores another host joinId', async () => {
  const prisma = {
    join: {
      findUnique: async (args: { where: Record<string, unknown> }) => {
        if ('hostUserId_clientIdempotencyKey' in args.where) return null;
        if (args.where.id === 'join-other') {
          return { id: 'join-other', hostUserId: 'host-b' };
        }
        return null;
      },
    },
    coinTransaction: {
      findUnique: async () => ({ refType: 'JOIN', refId: 'join-other' }),
    },
    joinOption: {
      findFirst: async () => null,
    },
  };
  const found = await findJoinIdByClientIdempotencyKey(prisma as never, {
    hostUserId: 'host-a',
    clientKey: 'shared-key',
    kind: 'standard',
  });
  assert.equal(found, null);
});

test('join unique (host, key) is the first lookup SSOT', async () => {
  const prisma = {
    join: {
      findUnique: async (args: { where: Record<string, unknown> }) => {
        const pair = args.where.hostUserId_clientIdempotencyKey as
          | { hostUserId: string; clientIdempotencyKey: string }
          | undefined;
        if (pair?.hostUserId === 'host-a' && pair.clientIdempotencyKey === 'k1') {
          return { id: 'join-claimed' };
        }
        return null;
      },
    },
    coinTransaction: {
      findUnique: async () => {
        throw new Error('coin lookup must not run when join unique hits');
      },
    },
    joinOption: {
      findFirst: async () => {
        throw new Error('option lookup must not run when join unique hits');
      },
    },
  };
  const found = await findJoinIdByClientIdempotencyKey(prisma as never, {
    hostUserId: 'host-a',
    clientKey: 'k1',
    kind: 'store_matching',
  });
  assert.equal(found, 'join-claimed');
});
