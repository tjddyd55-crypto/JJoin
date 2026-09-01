import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeClubEventRemainingCapacity,
  computeEventOccupiedSeats,
} from './club-management';
import {
  canAccessClubLinkedJoinChat,
  canAccessJoinChatWithClubBridge,
  isClubEventChatEligibleAttendance,
} from './join-chat-loop';

test('computeClubEventRemainingCapacity uses internal attending + external participants', () => {
  assert.equal(computeEventOccupiedSeats({ memberAttendingCount: 16, externalParticipantCount: 1 }), 17);
  assert.equal(computeClubEventRemainingCapacity(20, 16, 1), 3);
  assert.equal(computeClubEventRemainingCapacity(20, 16, 0), 4);
  assert.equal(computeClubEventRemainingCapacity(20, 25, 2), 0);
  assert.equal(computeClubEventRemainingCapacity(null, 3, 1), null);
});

test('club event chat eligibility by attendance state', () => {
  assert.equal(
    isClubEventChatEligibleAttendance({ response: 'ATTENDING', eventFinalized: false }),
    true,
  );
  assert.equal(
    isClubEventChatEligibleAttendance({ response: 'DECLINED', eventFinalized: false }),
    false,
  );
  assert.equal(
    isClubEventChatEligibleAttendance({ response: 'NO_RESPONSE', eventFinalized: false }),
    false,
  );
  assert.equal(
    isClubEventChatEligibleAttendance({
      response: 'ATTENDING',
      finalStatus: 'ATTENDED',
      eventFinalized: true,
    }),
    true,
  );
  assert.equal(
    isClubEventChatEligibleAttendance({
      response: 'ATTENDING',
      finalStatus: 'NO_SHOW',
      eventFinalized: true,
    }),
    false,
  );
  assert.equal(
    isClubEventChatEligibleAttendance({
      response: 'ATTENDING',
      eventFinalized: true,
    }),
    false,
  );
});

test('canAccessClubLinkedJoinChat requires eligible attendance row', () => {
  assert.equal(
    canAccessClubLinkedJoinChat({
      clubEventAttendance: { response: 'ATTENDING' },
      eventFinalized: false,
    }),
    true,
  );
  assert.equal(
    canAccessClubLinkedJoinChat({
      clubEventAttendance: { response: 'DECLINED' },
      eventFinalized: false,
    }),
    false,
  );
  assert.equal(canAccessClubLinkedJoinChat({ clubEventAttendance: null }), false);
});

test('canAccessJoinChatWithClubBridge prefers join participant then club bridge', () => {
  assert.equal(
    canAccessJoinChatWithClubBridge({
      participationStatus: 'APPROVED',
      role: 'MEMBER',
      clubBridge: { response: 'DECLINED' },
    }),
    true,
  );
  assert.equal(
    canAccessJoinChatWithClubBridge({
      participationStatus: null,
      role: null,
      clubBridge: { response: 'ATTENDING', eventFinalized: false },
    }),
    true,
  );
  assert.equal(
    canAccessJoinChatWithClubBridge({
      participationStatus: null,
      role: null,
      clubBridge: { response: 'NO_RESPONSE', eventFinalized: false },
    }),
    false,
  );
});
