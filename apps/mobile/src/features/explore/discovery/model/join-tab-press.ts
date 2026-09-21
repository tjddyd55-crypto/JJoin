/**
 * Bottom Join tab entry policy (SSOT).
 *
 * - Direct tab press → always SCREEN (default Join entry).
 * - Home FIELD/SCREEN 「전체보기」 and quick-menu hrefs set params themselves.
 * - Detail → back is not a tab press, so current track params stay as-is.
 */
export const JOIN_TAB_ROUTE_NAME = 'joins';
export const JOIN_TAB_DEFAULT_VENUE_TYPE = 'SCREEN' as const;

export type TabPressRoute = {
  name: string;
  params?: Record<string, unknown>;
};

/** Join tab ignores sticky params; other tabs keep whatever the navigator last stored. */
export function resolveTabPressParams(
  route: TabPressRoute,
): Record<string, unknown> | undefined {
  if (route.name === JOIN_TAB_ROUTE_NAME) {
    return { venueType: JOIN_TAB_DEFAULT_VENUE_TYPE };
  }
  return route.params;
}

/**
 * Join tab navigates even when already focused so FIELD leftover params reset.
 * Other tabs keep the existing "tap again does nothing" behavior.
 */
export function shouldNavigateOnTabPress(routeName: string, focused: boolean): boolean {
  if (routeName === JOIN_TAB_ROUTE_NAME) return true;
  return !focused;
}
