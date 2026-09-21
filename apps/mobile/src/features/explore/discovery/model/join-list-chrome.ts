/**
 * Join list top-chrome budget (logical px).
 * Layout/IA only — keeps the first viewport card-first.
 *
 * Before = title + SCREEN/FIELD toggle + default paddings (removed).
 * After  = title-less bar + compact 리스트/지역별 + shrunk date/region/sort.
 */

export const JOIN_LIST_CHROME_BEFORE = {
  appBarWithTitle: 48,
  trackTabs: 56,
  listTabs: 56,
  weekStrip: 76,
  regionChips: 42,
  sortRow: 48,
  sectionTitle: 38,
} as const;

export const JOIN_LIST_CHROME_AFTER = {
  appBar: 40,
  listTabs: 36,
  weekStrip: 52,
  regionChips: 32,
  sortRow: 32,
  sectionTitle: 28,
} as const;

export const JOIN_LIST_CARD_HEIGHT_ESTIMATE = 142;
export const JOIN_LIST_SHORT_VIEWPORT = 640;

export function sumJoinListChrome(heights: Record<string, number>): number {
  return Object.values(heights).reduce((sum, value) => sum + value, 0);
}

export function estimateFirstViewportCards(
  chromeHeight: number,
  viewportHeight = JOIN_LIST_SHORT_VIEWPORT,
  cardHeight = JOIN_LIST_CARD_HEIGHT_ESTIMATE,
): number {
  return (viewportHeight - chromeHeight) / cardHeight;
}
