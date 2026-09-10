/**
 * Android RN Modal often reports 0 safe-top while drawing under the status bar.
 * Take the larger of SafeArea inset and StatusBar.currentHeight.
 */
export function resolveModalTopInset(
  safeTop: number,
  androidStatusBarHeight: number | null | undefined,
): number {
  const status = androidStatusBarHeight ?? 0;
  if (!Number.isFinite(safeTop) || safeTop < 0) {
    return Math.max(0, status);
  }
  return Math.max(safeTop, status);
}
