import assert from 'node:assert/strict';
import test from 'node:test';
import {
  defaultFieldJoinCreateCost,
  fieldJoinCostEstimate,
  fieldJoinCostPayload,
  isFieldJoinCostValid,
  parseOptionalKrwInput,
} from './field-join-create-cost';

test('FIELD cost payload keeps KRW integers and omits caddie fee on NO_CADDIE', () => {
  const value = {
    ...defaultFieldJoinCreateCost(),
    greenFeePerPerson: 90000,
    cartFeeTotal: 80000,
    caddieMode: 'NO_CADDIE' as const,
    caddieFeeTotal: 0,
  };
  const payload = fieldJoinCostPayload(value);
  assert.equal(payload.caddieFeeTotal, null);
  assert.equal(payload.teeTimeMode, 'CONFIRMED');
  assert.equal(payload.greenFeePerPerson, 90000);
  assert.equal(isFieldJoinCostValid(value, 4), true);
  assert.equal(fieldJoinCostEstimate(value, 4).participantExpectedKrw, 110000);
});

test('optional KRW input stays integer-only', () => {
  assert.equal(parseOptionalKrwInput(''), null);
  assert.equal(parseOptionalKrwInput('80,000'), 80000);
  assert.equal(parseOptionalKrwInput('12.5'), 125);
});
