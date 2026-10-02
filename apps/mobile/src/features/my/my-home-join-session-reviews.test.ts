import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';

describe('MY home join session review entry', () => {
  test('MyHomeScreen links to join session reviews hub', () => {
    const source = readFileSync(
      join(import.meta.dirname, 'screens/MyHomeScreen.tsx'),
      'utf8',
    );
    assert.match(source, /label="쪼인 후기"/);
    assert.match(source, /\/my\/join-session-reviews/);
  });
});
