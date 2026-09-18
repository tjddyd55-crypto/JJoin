import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeFieldGolfSearchQuery } from '@jjoin/domain';

test('FIELD search query keeps type/name/sido/sigungu pagination', () => {
  const query = normalizeFieldGolfSearchQuery({
    name: '스카이',
    sido: '경기',
    sigungu: '용인시',
    page: 1,
    perPage: 20,
  });
  assert.equal(query.sido, '경기도');
  assert.equal(query.sigungu, '용인시');
  assert.equal(query.page, 1);
  assert.equal(query.skip, 0);
});
