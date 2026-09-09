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

/** Optional row above primary CTA (e.g. shortage hint). */
export const STICKY_ACTION_SHORTAGE_ROW_EXTRA = 32;

/** Scroll content padding so the last section clears the sticky CTA stack. */
export function stickyActionScrollPadding(insetsBottom: number): number {
  return stickyActionScrollPaddingForButton(insetsBottom, STICKY_ACTION_BUTTON_HEIGHT);
}

/** Scroll padding when sticky bar uses a custom button height (e.g. mall 52px CTA). */
export function stickyActionScrollPaddingForButton(
  insetsBottom: number,
  buttonHeight: number,
  options?: { extraContentHeight?: number; topPadding?: number },
): number {
  const top = options?.topPadding ?? STICKY_ACTION_TOP_PADDING;
  const extra = options?.extraContentHeight ?? 0;
  return top + extra + buttonHeight + stickyActionBottomPadding(insetsBottom);
}

/** Extra scroll padding for an additional full-width button row below the primary CTA. */
export function stickyActionSecondaryButtonExtra(): number {
  return STICKY_ACTION_BUTTON_HEIGHT + spacing.sm;
}
