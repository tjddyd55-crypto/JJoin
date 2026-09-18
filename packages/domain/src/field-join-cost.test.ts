import assert from 'node:assert/strict';
import test from 'node:test';
import {
  defaultFieldJoinDetails,
  estimateFieldJoinCost,
  formatFieldExpectedCostLabel,
  splitIntegerKrw,
  validateFieldJoinDetails,
} from './field-join-cost';
import {
  computeFieldOpenSeats,
  fieldRoundDurationRule,
  formatFieldOpenSeatsLabel,
  resolveFieldRoundHoles,
} from './field-join-round';

test('NO_CADDIE forces fee 0/null and excludes caddie from the estimate', () => {
  const result = validateFieldJoinDetails({
    participantCount: 4,
    caddieMode: 'NO_CADDIE',
    caddieFeeTotal: 0,
    greenFeePerPerson: 80000,
    greenFeePayer: 'EACH_PERSON',
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.caddieFeeTotal, null);
  assert.equal(result.value.caddieFeePayer, null);
  assert.equal(result.estimate.lines.some((line) => line.key === 'CADDIE'), false);
  assert.equal(result.estimate.participantExpectedKrw, 80000);
});

test('NO_CADDIE rejects a positive caddie fee', () => {
  const result = validateFieldJoinDetails({
    participantCount: 4,
    caddieMode: 'NO_CADDIE',
    caddieFeeTotal: 120000,
  });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, 'field_nocaddie_fee_must_be_zero');
});

test('unset fees are excluded from the participant estimate', () => {
  const estimate = estimateFieldJoinCost({
    participantCount: 4,
    greenFeePayer: 'EACH_PERSON',
    cartFeePayer: 'EQUAL_SPLIT',
    caddieMode: 'CADDIE',
  });
  assert.equal(estimate.participantExpectedKrw, null);
  assert.equal(estimate.hostExpectedKrw, null);
  assert.equal(estimate.lines.length, 0);
});

test('HOST green fee puts the full burden on the host', () => {
  const estimate = estimateFieldJoinCost({
    participantCount: 4,
    greenFeePerPerson: 90000,
    greenFeePayer: 'HOST',
  });
  assert.equal(estimate.participantExpectedKrw, 0);
  assert.equal(estimate.hostExpectedKrw, 360000);
});

test('EQUAL_SPLIT cart uses integer KRW and host absorbs remainder', () => {
  const split = splitIntegerKrw(100000, 3);
  assert.equal(split.perPerson, 33333);
  assert.equal(split.hostShare, 33334);
  const estimate = estimateFieldJoinCost({
    participantCount: 3,
    cartFeeTotal: 100000,
    cartFeePayer: 'EQUAL_SPLIT',
  });
  assert.equal(estimate.participantExpectedKrw, 33333);
  assert.equal(estimate.hostExpectedKrw, 33334);
});

test('CADDIE HOST payer is not mixed into coin math', () => {
  const estimate = estimateFieldJoinCost({
    participantCount: 4,
    caddieMode: 'CADDIE',
    caddieFeeTotal: 200000,
    caddieFeePayer: 'HOST',
    greenFeePerPerson: 70000,
    greenFeePayer: 'EACH_PERSON',
  });
  assert.equal(estimate.participantExpectedKrw, 70000);
  assert.equal(estimate.hostExpectedKrw, 270000);
  assert.equal(formatFieldExpectedCostLabel(estimate.participantExpectedKrw), '예상 70,000원');
});

test('validation rejects negatives, non-integers, zero participants, and v1 soft tee time', () => {
  assert.equal(
    validateFieldJoinDetails({ participantCount: 0, greenFeePerPerson: 10000 }).ok,
    false,
  );
  assert.equal(
    validateFieldJoinDetails({ participantCount: 4, greenFeePerPerson: -1 }).ok,
    false,
  );
  assert.equal(
    validateFieldJoinDetails({ participantCount: 4, cartFeeTotal: 1000.5 }).ok,
    false,
  );
  assert.equal(
    validateFieldJoinDetails({ participantCount: 4, greenFeePerPerson: 3_000_000 }).ok,
    false,
  );
  const soft = validateFieldJoinDetails({
    participantCount: 4,
    teeTimeMode: 'SOFT_WINDOW',
  });
  assert.equal(soft.ok, false);
  if (!soft.ok) assert.equal(soft.code, 'field_tee_time_must_be_confirmed');
});

test('deposit is schema-only and stays out of the KRW estimate', () => {
  const result = validateFieldJoinDetails({
    participantCount: 4,
    greenFeePerPerson: 80000,
    depositRequired: true,
    depositAmount: 20000,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.depositRequired, true);
  assert.equal(result.value.depositAmount, 20000);
  assert.equal(result.estimate.participantExpectedKrw, 80000);
});

test('default details are confirmed 18-hole NO_CADDIE with no fees', () => {
  const defaults = defaultFieldJoinDetails();
  assert.equal(defaults.roundHoles, 18);
  assert.equal(defaults.teeTimeMode, 'CONFIRMED');
  assert.equal(defaults.caddieMode, 'NO_CADDIE');
  assert.equal(defaults.greenFeePerPerson, null);
});

test('open seats count host in confirmed and keep recruiting = total - confirmed', () => {
  const seats = computeFieldOpenSeats(4, 1);
  assert.deepEqual(seats, { total: 4, confirmed: 1, recruiting: 3 });
  assert.equal(formatFieldOpenSeatsLabel(seats), '모집 4 · 확정 1 · 남은 자리 3');
});

test('round holes duration is fixed minutes and 9 ≠ course holeCount', () => {
  assert.deepEqual(fieldRoundDurationRule(18), { strategy: 'FIXED_MINUTES', fixedMinutes: 270 });
  assert.deepEqual(fieldRoundDurationRule(9), { strategy: 'FIXED_MINUTES', fixedMinutes: 150 });
  assert.equal(resolveFieldRoundHoles(27), 18);
  assert.equal(resolveFieldRoundHoles(9), 9);
});
