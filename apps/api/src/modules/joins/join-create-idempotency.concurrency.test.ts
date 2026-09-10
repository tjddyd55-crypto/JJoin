import assert from 'node:assert/strict';
import { test } from 'node:test';
import { executeJoinCreateWithHostKeyClaim } from './join-create-idempotency';

type HostKey = `${string}\0${string}`;

function hostKey(hostUserId: string, clientKey: string): HostKey {
  return `${hostUserId}\0${clientKey}`;
}

/**
 * PostgreSQL unique (host, key) under READ COMMITTED:
 * the second inserter waits, then either proceeds (first rolled back)
 * or gets unique_violation (first committed).
 */
function createPgLikeHostKeyIndex() {
  const committed = new Map<HostKey, string>();
  const inflight = new Map<HostKey, Promise<void>>();

  return {
    find(hostUserId: string, clientKey: string): string | null {
      return committed.get(hostKey(hostUserId, clientKey)) ?? null;
    },
    async insert(
      hostUserId: string,
      clientKey: string,
      joinId: string,
      work: () => Promise<void>,
    ): Promise<string> {
      const key = hostKey(hostUserId, clientKey);
      while (inflight.has(key)) {
        await inflight.get(key);
      }
      if (committed.has(key)) {
        const err = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
        throw err;
      }
      let release!: () => void;
      inflight.set(
        key,
        new Promise<void>((resolve) => {
          release = resolve;
        }),
      );
      try {
        await work();
        committed.set(key, joinId);
        return joinId;
      } finally {
        inflight.delete(key);
        release();
      }
    },
    size() {
      return committed.size;
    },
  };
}

function isMemoryUniqueViolation(error: unknown): boolean {
  return error instanceof Error && (error as { code?: string }).code === 'P2002';
}

test('Promise.all same host+key yields exactly one join and the same joinId', async () => {
  const index = createPgLikeHostKeyIndex();
  const created: string[] = [];

  const results = await Promise.all(
    Array.from({ length: 8 }, (_, i) =>
      executeJoinCreateWithHostKeyClaim({
        clientKey: 'same-client-key',
        findExisting: async () => {
          const id = index.find('host-a', 'same-client-key');
          return id ? { joinId: id } : null;
        },
        isUniqueViolation: isMemoryUniqueViolation,
        unresolvedConflict: () => {
          throw new Error('unresolved_conflict');
        },
        create: async () => {
          const joinId = `join-${i}`;
          await index.insert('host-a', 'same-client-key', joinId, async () => {
            await new Promise((r) => setTimeout(r, 15));
            created.push(joinId);
          });
          return { joinId };
        },
      }),
    ),
  );

  const ids = new Set(results.map((r) => r.joinId));
  assert.equal(ids.size, 1);
  assert.equal(index.size(), 1);
  assert.equal(created.length, 1);
  assert.equal(results[0].joinId, created[0]);
});

test('failed create does not leave a permanent host+key lock', async () => {
  const index = createPgLikeHostKeyIndex();
  let attempts = 0;

  await assert.rejects(
    () =>
      executeJoinCreateWithHostKeyClaim({
        clientKey: 'retry-key',
        findExisting: async () => {
          const id = index.find('host-a', 'retry-key');
          return id ? { joinId: id } : null;
        },
        isUniqueViolation: isMemoryUniqueViolation,
        unresolvedConflict: () => {
          throw new Error('unresolved_conflict');
        },
        create: async () => {
          attempts += 1;
          await index.insert('host-a', 'retry-key', 'join-fail', async () => {
            throw new Error('retryable_server_error');
          });
          return { joinId: 'join-fail' };
        },
      }),
    /retryable_server_error/,
  );
  assert.equal(index.size(), 0);

  const reused = await executeJoinCreateWithHostKeyClaim({
    clientKey: 'retry-key',
    findExisting: async () => {
      const id = index.find('host-a', 'retry-key');
      return id ? { joinId: id } : null;
    },
    isUniqueViolation: isMemoryUniqueViolation,
    unresolvedConflict: () => {
      throw new Error('unresolved_conflict');
    },
    create: async () => {
      attempts += 1;
      await index.insert('host-a', 'retry-key', 'join-ok', async () => undefined);
      return { joinId: 'join-ok' };
    },
  });
  assert.equal(reused.joinId, 'join-ok');
  assert.equal(index.size(), 1);
  assert.equal(attempts, 2);
});

test('different hosts with the same client key do not collide', async () => {
  const index = createPgLikeHostKeyIndex();

  const [a, b] = await Promise.all([
    executeJoinCreateWithHostKeyClaim({
      clientKey: 'shared-key',
      findExisting: async () => {
        const id = index.find('host-a', 'shared-key');
        return id ? { joinId: id } : null;
      },
      isUniqueViolation: isMemoryUniqueViolation,
      unresolvedConflict: () => {
        throw new Error('unresolved_conflict');
      },
      create: async () => {
        await index.insert('host-a', 'shared-key', 'join-a', async () => undefined);
        return { joinId: 'join-a' };
      },
    }),
    executeJoinCreateWithHostKeyClaim({
      clientKey: 'shared-key',
      findExisting: async () => {
        const id = index.find('host-b', 'shared-key');
        return id ? { joinId: id } : null;
      },
      isUniqueViolation: isMemoryUniqueViolation,
      unresolvedConflict: () => {
        throw new Error('unresolved_conflict');
      },
      create: async () => {
        await index.insert('host-b', 'shared-key', 'join-b', async () => undefined);
        return { joinId: 'join-b' };
      },
    }),
  ]);

  assert.equal(a.joinId, 'join-a');
  assert.equal(b.joinId, 'join-b');
  assert.equal(index.size(), 2);
});

test('lookup-first without unique still duplicates under Promise.all', async () => {
  const created: string[] = [];
  await Promise.all(
    [0, 1, 2, 3].map(async (i) => {
      if (created.length > 0) return created[0];
      await new Promise((r) => setTimeout(r, 8));
      created.push(`dup-${i}`);
      return created[created.length - 1];
    }),
  );
  assert.ok(created.length > 1, 'documents why DB unique is required');
});
