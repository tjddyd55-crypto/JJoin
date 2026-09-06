import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canDirectJoinGenderSlot,
  canDirectJoinGeneralCapacity,
  computeEffectiveCapacity,
  computeWaitlistOfferExpiresAt,
  computeWaitlistPosition,
  isWaitlistOfferActive,
  selectNextWaitlistOffers,
  WAITLIST_OFFER_TTL_MINUTES,
} from './join-waitlist';

test('host-inclusive planned count marks full when roster is full', () => {
  const participants = [
    { role: 'HOST', participationStatus: 'APPROVED' },
    { role: 'PARTICIPANT', participationStatus: 'APPROVED' },
    { role: 'PARTICIPANT', participationStatus: 'APPROVED' },
  ];
  assert.equal(
    canDirectJoinGeneralCapacity({ plannedPlayerCount: 3, participants }),
    false,
  );
  assert.equal(
    computeEffectiveCapacity({ plannedPlayerCount: 3, participants }).remainingGeneralSlots,
    0,
  );
});

test('effective capacity includes OFFERED reservations', () => {
  const snap = computeEffectiveCapacity({
    plannedPlayerCount: 4,
    participants: [
      { role: 'HOST', participationStatus: 'APPROVED' },
      { role: 'PARTICIPANT', participationStatus: 'APPROVED' },
      { role: 'PARTICIPANT', participationStatus: 'APPROVED' },
      { role: 'PARTICIPANT', participationStatus: 'APPROVED' },
      { role: 'PARTICIPANT', participationStatus: 'OFFERED' },
    ],
  });
  assert.equal(snap.confirmedCount, 3);
  assert.equal(snap.reservedOfferCount, 1);
  assert.equal(snap.remainingGeneralSlots, 0);
});

test('direct join blocked when offer reserves last slot', () => {
  const participants = [
    { role: 'PARTICIPANT', participationStatus: 'APPROVED' },
    { role: 'PARTICIPANT', participationStatus: 'APPROVED' },
    { role: 'PARTICIPANT', participationStatus: 'APPROVED' },
    { role: 'PARTICIPANT', participationStatus: 'OFFERED' },
  ];
  assert.equal(
    canDirectJoinGeneralCapacity({ plannedPlayerCount: 4, participants }),
    false,
  );
});

test('FIFO waitlist position', () => {
  const rows = [
    {
      participantId: 'a',
      userId: 'u1',
      participationStatus: 'WAITLISTED',
      appliedAt: new Date('2026-01-01T10:00:00Z'),
    },
    {
      participantId: 'b',
      userId: 'u2',
      participationStatus: 'WAITLISTED',
      appliedAt: new Date('2026-01-01T11:00:00Z'),
    },
  ];
  assert.equal(computeWaitlistPosition(rows, 'a'), 1);
  assert.equal(computeWaitlistPosition(rows, 'b'), 2);
});

test('gender slot: male full, female open', () => {
  const participants = [
    { role: 'PARTICIPANT', participationStatus: 'APPROVED', gender: 'MALE' as const },
    { role: 'PARTICIPANT', participationStatus: 'APPROVED', gender: 'MALE' as const },
    { role: 'PARTICIPANT', participationStatus: 'APPROVED', gender: 'FEMALE' as const },
  ];
  assert.equal(
    canDirectJoinGenderSlot({
      applicantGender: 'MALE',
      targetMaleCount: 2,
      targetFemaleCount: 2,
      participants,
    }),
    false,
  );
  assert.equal(
    canDirectJoinGenderSlot({
      applicantGender: 'FEMALE',
      targetMaleCount: 2,
      targetFemaleCount: 2,
      participants,
    }),
    true,
  );
});

test('two seats release offers A and B', () => {
  const waitlisted = [
    {
      participantId: 'a',
      userId: 'u1',
      participationStatus: 'WAITLISTED',
      appliedAt: new Date('2026-01-01T10:00:00Z'),
      gender: 'MALE' as const,
    },
    {
      participantId: 'b',
      userId: 'u2',
      participationStatus: 'WAITLISTED',
      appliedAt: new Date('2026-01-01T11:00:00Z'),
      gender: 'MALE' as const,
    },
    {
      participantId: 'c',
      userId: 'u3',
      participationStatus: 'WAITLISTED',
      appliedAt: new Date('2026-01-01T12:00:00Z'),
      gender: 'MALE' as const,
    },
  ];
  const participants = [
    { role: 'PARTICIPANT', participationStatus: 'APPROVED', gender: 'MALE' as const },
    { role: 'PARTICIPANT', participationStatus: 'APPROVED', gender: 'MALE' as const },
  ];
  const offers = selectNextWaitlistOffers({
    waitlisted,
    participants,
    plannedPlayerCount: 4,
    targetMaleCount: 4,
    targetFemaleCount: 0,
    useGenderSlots: true,
    maxOffers: 2,
  });
  assert.equal(offers.length, 2);
  assert.equal(offers[0].participantId, 'a');
  assert.equal(offers[1].participantId, 'b');
});

test('offer TTL default 30 minutes', () => {
  const offeredAt = new Date('2026-01-01T10:00:00Z');
  const expires = computeWaitlistOfferExpiresAt(offeredAt);
  assert.equal(expires.getTime() - offeredAt.getTime(), WAITLIST_OFFER_TTL_MINUTES * 60_000);
});

test('isWaitlistOfferActive respects expiry', () => {
  const now = new Date('2026-01-01T10:31:00Z');
  const offerExpiresAt = new Date('2026-01-01T10:30:00Z');
  assert.equal(
    isWaitlistOfferActive({ status: 'OFFERED', offerExpiresAt, now }),
    false,
  );
});
