import assert from 'node:assert/strict';
import test from 'node:test';
import {
  JOIN_CREATED_AUDIENCE_BATCH_SIZE,
  collectPaginatedAudienceIds,
} from './index';

function padUser(prefix: string, index: number): string {
  return `${prefix}-${String(index).padStart(3, '0')}`;
}

function createOrderedStore<T extends { id: string }>(rows: T[]) {
  const ordered = [...rows].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  let fetchCount = 0;
  return {
    fetchCount: () => fetchCount,
    fetchPage: async (cursor: string | undefined, take: number): Promise<T[]> => {
      fetchCount += 1;
      const start = cursor ? ordered.findIndex((row) => row.id === cursor) + 1 : 0;
      return ordered.slice(Math.max(start, 0), Math.max(start, 0) + take);
    },
  };
}

async function collectNamedAudience(prefix: string): Promise<string[]> {
  const rows = Array.from({ length: 250 }, (_, i) => ({ id: padUser(prefix, i + 1) }));
  const store = createOrderedStore(rows);
  const ids = await collectPaginatedAudienceIds({
    pageSize: JOIN_CREATED_AUDIENCE_BATCH_SIZE,
    fetchPage: store.fetchPage,
    cursorOf: (row) => row.id,
    idOf: (row) => row.id,
    include: () => true,
  });
  assert.ok(store.fetchCount() >= 2, 'batch size is a page, not a total cap');
  return ids;
}

test('JOIN_CREATED_AUDIENCE_BATCH_SIZE remains the page size of 200', () => {
  assert.equal(JOIN_CREATED_AUDIENCE_BATCH_SIZE, 200);
});

test('FIELD AUTO audience includes eligible user 201+', async () => {
  const ids = await collectNamedAudience('auto');
  assert.equal(ids.length, 250);
  assert.ok(ids.includes('auto-201'));
  assert.ok(ids.includes('auto-250'));
});

test('FIELD CUSTOM audience includes eligible user 201+', async () => {
  const ids = await collectNamedAudience('custom');
  assert.equal(ids.length, 250);
  assert.ok(ids.includes('custom-201'));
  assert.ok(ids.includes('custom-250'));
});

test('SCREEN same-admin-region audience includes eligible user 201+', async () => {
  const ids = await collectNamedAudience('admin');
  assert.equal(ids.length, 250);
  assert.ok(ids.includes('admin-201'));
  assert.ok(ids.includes('admin-250'));
});

test('audience pagination continues when a page has zero eligible rows', async () => {
  const rows = [
    ...Array.from({ length: 200 }, (_, i) => ({ id: padUser('blocked', i + 1), ok: false })),
    ...Array.from({ length: 50 }, (_, i) => ({ id: padUser('ok', i + 1), ok: true })),
  ];
  const store = createOrderedStore(rows);
  const ids = await collectPaginatedAudienceIds({
    pageSize: JOIN_CREATED_AUDIENCE_BATCH_SIZE,
    fetchPage: store.fetchPage,
    cursorOf: (row) => row.id,
    idOf: (row) => row.id,
    include: (row) => row.ok,
  });
  assert.equal(store.fetchCount(), 2);
  assert.equal(ids.length, 50);
  assert.ok(ids.includes('ok-001'));
  assert.ok(ids.includes('ok-050'));
});
