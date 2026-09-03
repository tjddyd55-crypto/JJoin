import {
  semanticColors,
  premiumColors,
  layoutSpacing,
  spacing,
  radius,
  sizes,
  typography,
  opacity,
  shadows,
  palette,
} from '../tokens';

/** Bright Social Sports theme — code design SSOT for general app UI. */
export const brightSocialSportsTheme = {
  name: 'brightSocialSports' as const,
  colors: semanticColors,
  premium: premiumColors,
  palette,
  spacing,
  layoutSpacing,
  radius,
  sizes,
  typography,
  opacity,
  shadows,
} as const;

export type BrightSocialSportsTheme = typeof brightSocialSportsTheme;

/**
 * @deprecated Use `brightSocialSportsTheme`. Alias kept so existing ThemeProvider
 * consumers keep compiling during the rebrand.
 */
export const clubMinimalTheme = brightSocialSportsTheme;
export type ClubMinimalTheme = BrightSocialSportsTheme;
