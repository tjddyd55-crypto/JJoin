import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatCoin,
  formatCoinAmount,
  formatCoinWithLabel,
  formatNumber,
  formatSignedCoin,
  formatSignedCoinAmount,
} from './display-number';

test('formatCoinAmount groups thousands for wallet balances', () => {
  assert.equal(formatCoinAmount(0), '0');
  assert.equal(formatCoinAmount(200), '200');
  assert.equal(formatCoinAmount(1000), '1,000');
  assert.equal(formatCoinAmount(10000), '10,000');
  assert.equal(formatCoinAmount(80200), '80,200');
  assert.equal(formatCoinAmount(1000000), '1,000,000');
  assert.equal(formatCoinAmount('80200'), '80,200');
  assert.equal(formatCoinAmount(null), '0');
  assert.equal(formatCoinAmount(undefined), '0');
  assert.equal(formatCoinAmount(''), '0');
  assert.equal(formatCoinAmount('not-a-number'), '0');
});

test('formatSignedCoinAmount keeps ledger sign with commas', () => {
  assert.equal(formatSignedCoinAmount('+80200'), '+80,200');
  assert.equal(formatSignedCoinAmount('-1000'), '-1,000');
  assert.equal(formatSignedCoinAmount(0), '0');
  assert.equal(formatSignedCoinAmount(null), '0');
});

test('formatNumber groups thousands', () => {
  assert.equal(formatNumber(0), '0');
  assert.equal(formatNumber(999), '999');
  assert.equal(formatNumber(1000), '1,000');
  assert.equal(formatNumber(5000), '5,000');
  assert.equal(formatNumber(10000), '10,000');
  assert.equal(formatNumber(80200), '80,200');
  assert.equal(formatNumber(6113), '6,113');
  assert.equal(formatNumber('5000'), '5,000');
  assert.equal(formatNumber(null), '—');
  assert.equal(formatNumber(undefined), '—');
  assert.equal(formatNumber('—'), '—');
});

test('formatCoin appends C suffix', () => {
  assert.equal(formatCoin(5000), '5,000C');
  assert.equal(formatCoin(10000), '10,000C');
  assert.equal(formatCoin(80200), '80,200C');
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
  assert.equal(formatCoinWithLabel(80200), '80,200 Coin');
  assert.equal(formatCoinWithLabel(null), '— Coin');
});
