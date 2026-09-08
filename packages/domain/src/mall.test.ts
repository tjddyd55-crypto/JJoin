import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveMallPurchaseState, sortMallProducts } from './mall';

test('resolveMallPurchaseState returns available when balance covers price', () => {
  assert.equal(
    resolveMallPurchaseState({
      productStatus: 'ACTIVE',
      stock: 3,
      coinPrice: '2000',
      availableCoin: '3200',
    }),
    'available',
  );
});

test('resolveMallPurchaseState returns insufficient_coin when balance is low', () => {
  assert.equal(
    resolveMallPurchaseState({
      productStatus: 'ACTIVE',
      stock: 3,
      coinPrice: '2000',
      availableCoin: '500',
    }),
    'insufficient_coin',
  );
});

test('resolveMallPurchaseState returns sold_out when stock is zero', () => {
  assert.equal(
    resolveMallPurchaseState({
      productStatus: 'ACTIVE',
      stock: 0,
      coinPrice: '2000',
      availableCoin: '5000',
    }),
    'sold_out',
  );
});

test('sortMallProducts sorts recommended by sortOrder', () => {
  const items = [
    { id: 'a', sortOrder: 2, createdAt: '2026-01-02T00:00:00.000Z', coinPrice: '3000' },
    { id: 'b', sortOrder: 1, createdAt: '2026-01-03T00:00:00.000Z', coinPrice: '1000' },
    { id: 'c', sortOrder: 3, createdAt: '2026-01-01T00:00:00.000Z', coinPrice: '2000' },
  ];
  const sorted = sortMallProducts(items, 'recommended');
  assert.deepEqual(sorted.map((x) => x.id), ['b', 'a', 'c']);
});

test('sortMallProducts sorts coin ascending', () => {
  const items = [
    { id: 'a', sortOrder: 2, createdAt: '2026-01-02T00:00:00.000Z', coinPrice: '3000' },
    { id: 'b', sortOrder: 1, createdAt: '2026-01-03T00:00:00.000Z', coinPrice: '1000' },
    { id: 'c', sortOrder: 3, createdAt: '2026-01-01T00:00:00.000Z', coinPrice: '2000' },
  ];
  const sorted = sortMallProducts(items, 'coin_asc');
  assert.deepEqual(sorted.map((x) => x.id), ['b', 'c', 'a']);
});
