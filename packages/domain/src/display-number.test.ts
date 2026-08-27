import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatCoin,
  formatCoinWithLabel,
  formatNumber,
  formatSignedCoin,
} from './display-number';

test('formatNumber groups thousands in ko-KR', () => {
  assert.equal(formatNumber(0), '0');
  assert.equal(formatNumber(999), '999');
  assert.equal(formatNumber(1000), '1,000');
  assert.equal(formatNumber(5000), '5,000');
  assert.equal(formatNumber(10000), '10,000');
  assert.equal(formatNumber(6113), '6,113');
  assert.equal(formatNumber('5000'), '5,000');
  assert.equal(formatNumber(null), '—');
  assert.equal(formatNumber(undefined), '—');
  assert.equal(formatNumber('—'), '—');
});

test('formatCoin appends C suffix', () => {
  assert.equal(formatCoin(5000), '5,000C');
  assert.equal(formatCoin(10000), '10,000C');
  assert.equal(formatCoin(0), '0C');
  assert.equal(formatCoin(null), '—');
});

test('formatSignedCoin includes sign for non-zero', () => {
  assert.equal(formatSignedCoin(5000), '+5,000C');
  assert.equal(formatSignedCoin(-5000), '-5,000C');
  assert.equal(formatSignedCoin(0), '0C');
  assert.equal(formatSignedCoin('20000'), '+20,000C');
});

test('formatCoinWithLabel keeps Coin word', () => {
  assert.equal(formatCoinWithLabel(5000), '5,000 Coin');
  assert.equal(formatCoinWithLabel(null), '— Coin');
});
