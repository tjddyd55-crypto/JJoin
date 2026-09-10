import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { MallProductStatus } from '@jjoin/types';
import { buildMallPolicyRows } from './mallProductPolicy';

const baseProduct = {
  id: 'p1',
  name: 'demo',
  slug: 'demo',
  categoryId: 'c1',
  categoryName: 'cat',
  coinPrice: '100',
  stock: 1,
  status: MallProductStatus.ACTIVE,
  sortOrder: 0,
  badge: null,
  coverImageUrl: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  shortDescription: null,
  purchaseState: 'available' as const,
  description: null,
  exchangeGuide: null,
  usageGuide: null,
  validityGuide: null,
  exchangeRefundGuide: null,
  noticeGuide: null,
  images: [],
  contentBlocks: [],
  availableCoin: '1000',
  remainingCoinAfterPurchase: '900',
};

test('buildMallPolicyRows omits empty policy fields', () => {
  const rows = buildMallPolicyRows({
    ...baseProduct,
    usageGuide: '  ',
    validityGuide: '30일',
    exchangeRefundGuide: null,
    noticeGuide: '주의',
  });
  assert.equal(rows.length, 2);
  assert.equal(rows[0]?.label, '유효기간');
  assert.equal(rows[1]?.label, '주의사항');
});

test('mall detail screen places policy section at bottom', () => {
  const source = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), './screens/JoinMallProductDetailScreen.tsx'),
    'utf8',
  );
  assert.match(source, /MallProductPolicySection/);
  assert.doesNotMatch(source, /productInfoRow/);
  assert.doesNotMatch(source, /사용 방법 · 유효기간 · 환불 정책/);
});
