import assert from 'node:assert/strict';
import test from 'node:test';
import { applyClubsUiGateToPushRoute, clubHrefOrUnavailable, isClubsUiEnabled } from './clubs-ui-gate';

test('clubs UI is hidden unless the flag is explicitly true', () => {
  assert.equal(isClubsUiEnabled(undefined), false);
  assert.equal(isClubsUiEnabled({ clubsUiEnabled: false } as never), false);
  assert.equal(isClubsUiEnabled({ clubsUiEnabled: true } as never), true);
  assert.equal(clubHrefOrUnavailable({ clubsUiEnabled: false } as never, '/my/clubs'), '/unavailable');
  assert.equal(clubHrefOrUnavailable({ clubsUiEnabled: true } as never, '/my/clubs'), '/my/clubs');
});

test('club push deep links become unavailable when clubs UI is off', () => {
  assert.deepEqual(
    applyClubsUiGateToPushRoute({ kind: 'club', clubId: 'c1' }, { clubsUiEnabled: false } as never),
    { kind: 'unavailable' },
  );
  assert.deepEqual(
    applyClubsUiGateToPushRoute({ kind: 'join', joinId: 'j1' }, { clubsUiEnabled: false } as never),
    { kind: 'join', joinId: 'j1' },
  );
});
