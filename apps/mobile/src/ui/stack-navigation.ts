/**
 * Nested stack back parity with Android system back.
 * Prefer leaf goBack → parent goBack → expo-router.back (caller supplies routerBack).
 */

export type NavLike = {
  canGoBack: () => boolean;
  goBack: () => void;
  getParent?: () => NavLike | undefined;
};

export function popStackOrParent(
  navigation: NavLike,
  routerBack: () => void,
  canRouterGoBack: () => boolean = () => true,
): void {
  if (navigation.canGoBack()) {
    navigation.goBack();
    return;
  }
  const parent = navigation.getParent?.();
  if (parent?.canGoBack()) {
    parent.goBack();
    return;
  }
  if (canRouterGoBack()) {
    routerBack();
  }
}
