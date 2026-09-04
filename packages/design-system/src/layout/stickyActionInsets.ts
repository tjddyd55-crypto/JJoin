import { layoutSpacing, sizes, spacing } from '../tokens';

/** Top padding above sticky CTA content (Figma / handoff). */
export const STICKY_ACTION_TOP_PADDING = spacing.sm;

/** Extra visual gap between CTA and system navigation (beyond safe-area inset). */
export const STICKY_ACTION_BOTTOM_EXTRA = spacing.sm;

/** Horizontal inset for sticky CTA bar @390. */
export const STICKY_ACTION_HORIZONTAL_PADDING = layoutSpacing.screenHorizontalCompact;

/** Figma Bright Join primary sticky CTA height. */
export const STICKY_ACTION_BUTTON_HEIGHT = sizes.button.lg;

export function stickyActionBottomPadding(insetsBottom: number): number {
  return insetsBottom + STICKY_ACTION_BOTTOM_EXTRA;
}

/** Scroll content padding so the last section clears the sticky CTA stack. */
export function stickyActionScrollPadding(insetsBottom: number): number {
  return (
    STICKY_ACTION_TOP_PADDING +
    STICKY_ACTION_BUTTON_HEIGHT +
    stickyActionBottomPadding(insetsBottom)
  );
}
