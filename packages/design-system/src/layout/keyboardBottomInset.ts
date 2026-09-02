/**
 * Keyboard scroll inset helpers (pure — no React Native imports).
 */

/** Desired gap between focused field bottom and IME top. */
export const KEYBOARD_GAP_PX = 24;

/**
 * Extra clearance for IME chrome (Samsung suggestion/AI toolbar, Gboard strip).
 * endCoordinates.screenY is usually the true IME top; keep a modest buffer.
 */
export const KEYBOARD_IME_CHROME_PX = 48;

export const KEYBOARD_SCROLL_CLEARANCE_PX = KEYBOARD_GAP_PX + KEYBOARD_IME_CHROME_PX;

/**
 * Bottom scroll padding while the keyboard is open.
 *
 * Android often uses adjustResize (window already shrinks to keyboard top).
 * In that case padding must NOT include full keyboardHeight — only clearance
 * so the last field can sit above the IME. When the window still overlaps the
 * keyboard (adjustPan / overlay), include the real keyboard height.
 */
export function resolveKeyboardBottomInset(args: {
  keyboardHeight: number;
  keyboardTop: number;
  windowHeight: number;
  clearancePx?: number;
}): number {
  const clearance = args.clearancePx ?? KEYBOARD_SCROLL_CLEARANCE_PX;
  const height = Math.max(0, args.keyboardHeight);
  if (height <= 0) return 0;

  const uncoveredBottom = Math.max(0, args.windowHeight - args.keyboardTop);
  const layoutAlreadyAvoidsKeyboard = uncoveredBottom < height * 0.5;
  return layoutAlreadyAvoidsKeyboard ? clearance : height + clearance;
}
