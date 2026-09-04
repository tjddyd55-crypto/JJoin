/**
 * Join detail DEV QA controls are hidden unless explicitly enabled.
 * Even in development builds, settlement QA buttons must not appear in normal screenshots.
 */
export function isJoinDetailDevPanelEnabled(): boolean {
  const flag = process.env.EXPO_PUBLIC_JOIN_DETAIL_DEV_PANEL;
  return flag === '1' || flag === 'true';
}
