import assert from 'node:assert/strict';
import test from 'node:test';
import { createJoinSchema, firstZodIssueCode } from '@jjoin/validation';
import { estimateFieldJoinCost } from '@jjoin/domain';
import { joinCreateClientMessage } from './join-create-errors';
import { mapFieldJoinDetailDto } from './field-join-detail.map';

const venueId = '11111111-1111-4111-8111-111111111111';
const startAt = '2026-09-20T01:00:00.000Z';

test('FIELD create with fees maps to a retrieve DTO and keeps KRW off the coin fields', () => {
  const parsed = createJoinSchema.safeParse({
    venueId,
    startAt,
    plannedPlayerCount: 4,
    joinMethod: 'OPEN',
    venueType: 'FIELD',
    rewardPerParticipant: '100',
    fieldDetails: {
      greenFeePerPerson: 90000,
      greenFeePayer: 'EACH_PERSON',
      cartFeeTotal: 80000,
      cartFeePayer: 'EQUAL_SPLIT',
      caddieMode: 'CADDIE',
      caddieFeeTotal: 120000,
      caddieFeePayer: 'HOST',
      roundHoles: 18,
      teeTimeMode: 'CONFIRMED',
    },
  });
  assert.equal(parsed.success, true);
  if (!parsed.success) return;
  assert.equal(parsed.data.rewardPerParticipant, '100');
  const dto = mapFieldJoinDetailDto(
    {
      greenFeePerPerson: 90000,
      greenFeePayer: 'EACH_PERSON',
      cartFeeTotal: 80000,
      cartFeePayer: 'EQUAL_SPLIT',
      caddieMode: 'CADDIE',
      caddieFeeTotal: 120000,
      caddieFeePayer: 'HOST',
      roundHoles: 18,
      teeTimeMode: 'CONFIRMED',
      minFieldHandicap: null,
      maxFieldHandicap: null,
      depositRequired: false,
      depositAmount: null,
    },
    4,
  );
  assert.ok(dto);
  assert.equal(dto?.cost.participantExpectedKrw, 110000);
  assert.equal(dto?.cost.hostExpectedKrw, 230000);
  assert.notEqual(String(dto?.cost.participantExpectedKrw), parsed.data.rewardPerParticipant);
});

test('legacy FIELD retrieve without detail stays null-safe', () => {
  assert.equal(mapFieldJoinDetailDto(null, 4), null);
  assert.equal(mapFieldJoinDetailDto(undefined, 4), null);
});

test('FIELD create rejects invalid capacity and invalid fees with client messages', () => {
  const six = createJoinSchema.safeParse({
    venueId,
    startAt,
    plannedPlayerCount: 6,
    joinMethod: 'OPEN',
    venueType: 'FIELD',
  });
  assert.equal(six.success, false);
  if (!six.success) {
    const code = firstZodIssueCode(six.error, 'invalid_create_join');
    assert.equal(code, 'field_capacity_not_allowed');
    assert.match(joinCreateClientMessage(code), /2·3·4/);
  }

  const badFee = createJoinSchema.safeParse({
    venueId,
    startAt,
    plannedPlayerCount: 4,
    joinMethod: 'OPEN',
    venueType: 'FIELD',
    fieldDetails: { caddieMode: 'NO_CADDIE', caddieFeeTotal: 50000 },
  });
  assert.equal(badFee.success, false);
  if (!badFee.success) {
    const code = firstZodIssueCode(badFee.error, 'invalid_create_join');
    assert.equal(code, 'field_nocaddie_fee_must_be_zero');
  }
});

test('SCREEN create still accepts 6 and foursome without mixing FIELD KRW', () => {
  const screen = createJoinSchema.safeParse({
    venueId,
    startAt,
    plannedPlayerCount: 6,
    joinMethod: 'OPEN',
    venueType: 'SCREEN',
    playFormat: 'INDIVIDUAL',
    rewardPerParticipant: '50',
  });
  assert.equal(screen.success, true);

  const estimate = estimateFieldJoinCost({
    participantCount: 4,
    greenFeePerPerson: 80000,
    greenFeePayer: 'EACH_PERSON',
  });
  assert.equal(estimate.participantExpectedKrw, 80000);
});
