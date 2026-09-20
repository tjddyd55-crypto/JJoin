import assert from 'node:assert/strict';
import test from 'node:test';
import {
  JOIN_CREATED_AUDIENCE_BATCH_SIZE,
  collectPaginatedAudienceIds,
} from '@jjoin/domain';

function pad(prefix: string, n: number): string {
  return `${prefix}-${String(n).padStart(3, '0')}`;
}

async function collectPath(path: 'AUTO' | 'CUSTOM' | 'SAME_ADMIN_REGION'): Promise<string[]> {
  const prefix = path.toLowerCase().replace(/_/g, '-');
  const rows = Array.from({ length: 250 }, (_, i) => ({ id: pad(prefix, i + 1) }));
  return collectPaginatedAudienceIds({
    pageSize: JOIN_CREATED_AUDIENCE_BATCH_SIZE,
    fetchPage: async (cursor, take) => {
      const start = cursor ? rows.findIndex((row) => row.id === cursor) + 1 : 0;
      return rows.slice(start, start + take);
    },
    cursorOf: (row) => row.id,
    idOf: (row) => row.id,
    include: () => true,
  });
}

test('FIELD AUTO JOIN_CREATED audience walks past the first 200 users', async () => {
  const ids = await collectPath('AUTO');
  assert.equal(ids.length, 250);
  assert.ok(ids.includes('auto-201'));
});

test('FIELD CUSTOM JOIN_CREATED audience walks past the first 200 users', async () => {
  const ids = await collectPath('CUSTOM');
  assert.equal(ids.length, 250);
  assert.ok(ids.includes('custom-201'));
});

test('SCREEN SAME_ADMIN_REGION JOIN_CREATED audience walks past the first 200 users', async () => {
  const ids = await collectPath('SAME_ADMIN_REGION');
  assert.equal(ids.length, 250);
  assert.ok(ids.includes('same-admin-region-201'));
});
