import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatKoreanPhoneDisplay,
  formatKoreanPhoneInput,
  normalizePhoneDigits,
} from './phone';

test('normalizePhoneDigits strips non-digits and caps length', () => {
  assert.equal(normalizePhoneDigits('010-1234-5678'), '01012345678');
  assert.equal(normalizePhoneDigits('01012345678999'), '01012345678');
});

test('formatKoreanPhoneInput mobile 11 digits', () => {
  assert.equal(formatKoreanPhoneInput('01012345678'), '010-1234-5678');
  assert.equal(formatKoreanPhoneInput('0101234567'), '010-123-4567');
  assert.equal(formatKoreanPhoneInput('010123'), '010-123');
  assert.equal(formatKoreanPhoneInput('01022221382'), '010-2222-1382');
});

test('formatKoreanPhoneInput seoul 02', () => {
  assert.equal(formatKoreanPhoneInput('021234567'), '02-123-4567');
  assert.equal(formatKoreanPhoneInput('0212345678'), '02-1234-5678');
});

test('formatKoreanPhoneDisplay accepts already formatted', () => {
  assert.equal(formatKoreanPhoneDisplay('010-2222-1382'), '010-2222-1382');
  assert.equal(formatKoreanPhoneDisplay('01022221382'), '010-2222-1382');
});
