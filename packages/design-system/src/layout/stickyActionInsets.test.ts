import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  STICKY_ACTION_BOTTOM_EXTRA,
  STICKY_ACTION_BUTTON_HEIGHT,
  STICKY_ACTION_TOP_PADDING,
  stickyActionBottomPadding,
  stickyActionScrollPadding,
} from './stickyActionInsets';

test('stickyActionBottomPadding adds safe inset and visual gap', () => {
  assert.equal(stickyActionBottomPadding(0), STICKY_ACTION_BOTTOM_EXTRA);
  assert.equal(stickyActionBottomPadding(48), 48 + STICKY_ACTION_BOTTOM_EXTRA);
});

test('stickyActionScrollPadding covers CTA stack height', () => {
  assert.equal(
    stickyActionScrollPadding(0),
    STICKY_ACTION_TOP_PADDING + STICKY_ACTION_BUTTON_HEIGHT + STICKY_ACTION_BOTTOM_EXTRA,
  );
  assert.equal(stickyActionScrollPadding(34), 12 + STICKY_ACTION_BUTTON_HEIGHT + 34 + 12);
});
