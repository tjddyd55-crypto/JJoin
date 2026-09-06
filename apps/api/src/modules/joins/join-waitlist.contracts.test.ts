import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  computeEffectiveCapacity,
  selectNextWaitlistOffers,
  canDirectJoinGeneralCapacity,
} from '@jjoin/domain';

test('CASE 66: last slot race — reserved offer blocks direct join', () => {
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
  assert.equal(
    computeEffectiveCapacity({ plannedPlayerCount: 4, participants }).remainingGeneralSlots,
    0,
  );
});

test('CASE 65: two seats → two offers', () => {
  const waitlisted = [
    {
      participantId: 'a',
      userId: 'u1',
      participationStatus: 'WAITLISTED',
      appliedAt: new Date(1),
      gender: 'MALE' as const,
    },
    {
      participantId: 'b',
      userId: 'u2',
      participationStatus: 'WAITLISTED',
      appliedAt: new Date(2),
      gender: 'MALE' as const,
    },
    {
      participantId: 'c',
      userId: 'u3',
      participationStatus: 'WAITLISTED',
      appliedAt: new Date(3),
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
    useGenderSlots: false,
    maxOffers: 2,
  });
  assert.equal(offers.length, 2);
});
