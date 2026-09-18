import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldRunOnKstCalendar } from '../../golf-facilities/sync/public-golf-facility-sync.service';
import { FieldGolfCourseSyncService } from './field-golf-course-sync.service';

test('FIELD sync reuses SCREEN KST 1/16 gate — not a new monthly cadence', () => {
  assert.equal(shouldRunOnKstCalendar(new Date('2026-07-31T15:30:00.000Z')), true);
  assert.equal(shouldRunOnKstCalendar(new Date('2026-08-15T19:00:00.000Z')), true);
  assert.equal(shouldRunOnKstCalendar(new Date('2026-08-01T19:00:00.000Z')), false);
});

test('FIELD sync service is constructable without inventing a parallel Join engine', () => {
  const prisma = {} as ConstructorParameters<typeof FieldGolfCourseSyncService>[0];
  const sync = new FieldGolfCourseSyncService(prisma);
  assert.equal(typeof sync.run, 'function');
});
