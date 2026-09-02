import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatNumberWithThousandsSeparator,
  normalizeRewardPerParticipantInput,
  parseNumericInput,
} from './numeric-input';

test('parseNumericInput strips commas and leading zeros', () => {
  assert.equal(parseNumericInput('10,000'), '10000');
  assert.equal(parseNumericInput('1,000'), '1000');
  assert.equal(parseNumericInput('0001000'), '1000');
  assert.equal(parseNumericInput(''), null);
  assert.equal(parseNumericInput('abc'), null);
});

test('formatNumberWithThousandsSeparator groups digits', () => {
  assert.equal(formatNumberWithThousandsSeparator(1000), '1,000');
  assert.equal(formatNumberWithThousandsSeparator(10000), '10,000');
  assert.equal(formatNumberWithThousandsSeparator(100000), '100,000');
  assert.equal(formatNumberWithThousandsSeparator(''), '');
});

test('normalizeRewardPerParticipantInput empty becomes 0', () => {
  assert.equal(normalizeRewardPerParticipantInput(''), '0');
  assert.equal(normalizeRewardPerParticipantInput('10,000'), '10000');
});
