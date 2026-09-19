import assert from 'node:assert/strict';
import test from 'node:test';
import {
  defaultFieldJoinCreateCost,
  fieldJoinCostEstimate,
  fieldJoinCostPayload,
  isFieldJoinCostValid,
  parseOptionalKrwInput,
} from './field-join-create-cost';

test('FIELD create payload is green-fee + benefit flags and drops cart/caddie amounts', () => {
  const value = {
    ...defaultFieldJoinCreateCost(),
    greenFeePerPerson: 90000,
    cartFeeTotal: 80000,
    caddieMode: 'CADDIE' as const,
    caddieFeeTotal: 120000,
    benefitGreenFee: true,
    benefitCart: true,
  };
  const payload = fieldJoinCostPayload(value);
  assert.equal(payload.greenFeePerPerson, 90000);
  assert.equal(payload.cartFeeTotal, null);
  assert.equal(payload.caddieFeeTotal, null);
  assert.equal(payload.caddieMode, 'NO_CADDIE');
  assert.equal(payload.teeTimeMode, 'CONFIRMED');
  assert.equal(payload.benefitGreenFee, true);
  assert.equal(payload.benefitCart, true);
  assert.equal(isFieldJoinCostValid(value, 4), true);
  assert.equal(fieldJoinCostEstimate({ ...value, cartFeeTotal: null, caddieFeeTotal: null }, 4).participantExpectedKrw, 90000);
});

test('optional KRW input stays integer-only', () => {
  assert.equal(parseOptionalKrwInput(''), null);
  assert.equal(parseOptionalKrwInput('80,000'), 80000);
  assert.equal(parseOptionalKrwInput('12.5'), 125);
});
