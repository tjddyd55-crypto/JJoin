import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  STICKY_ACTION_BOTTOM_EXTRA,
  STICKY_ACTION_BUTTON_HEIGHT,
  STICKY_ACTION_SHORTAGE_ROW_EXTRA,
  STICKY_ACTION_TOP_PADDING,
  stickyActionBottomPadding,
  stickyActionScrollPadding,
  stickyActionScrollPaddingForButton,
  stickyActionSecondaryButtonExtra,
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

test('stickyActionScrollPaddingForButton supports custom CTA height and extra rows', () => {
  assert.equal(
    stickyActionScrollPaddingForButton(0, 52),
    STICKY_ACTION_TOP_PADDING + 52 + STICKY_ACTION_BOTTOM_EXTRA,
  );
  assert.equal(
    stickyActionScrollPaddingForButton(34, 52, { extraContentHeight: STICKY_ACTION_SHORTAGE_ROW_EXTRA }),
    STICKY_ACTION_TOP_PADDING + STICKY_ACTION_SHORTAGE_ROW_EXTRA + 52 + 34 + STICKY_ACTION_BOTTOM_EXTRA,
  );
});

test('stickyActionSecondaryButtonExtra accounts for second button row', () => {
  assert.equal(stickyActionSecondaryButtonExtra(), STICKY_ACTION_BUTTON_HEIGHT + 12);
});
