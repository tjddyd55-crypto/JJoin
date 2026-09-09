import { StickyActionFrame, type StickyActionFrameProps } from './StickyActionFrame';

export type SafeStickyBottomBarProps = StickyActionFrameProps;

/**
 * SSOT sticky bottom container: top border, surface background, horizontal padding,
 * and `insets.bottom` via `useSafeAreaInsets()`.
 *
 * Does not change CTA button height — only the bar's bottom padding.
 */
export function SafeStickyBottomBar(props: SafeStickyBottomBarProps) {
  return <StickyActionFrame {...props} />;
}
