import { palette } from './palette';

/**
 * Semantic Bright Social Sports colors — preferred via `useTheme().colors`.
 * Premium Black & Gold lives under `premiumColors` / `theme.premium`.
 */
export const semanticColors = {
  app: {
    background: palette.warmWhite,
  },
  surface: {
    base: palette.warmWhite,
    card: palette.white,
    elevated: palette.softSurface,
    floating: palette.white,
    soft: palette.paleGreen,
  },
  border: {
    subtle: palette.borderLight,
    strong: palette.mutedText,
  },
  action: {
    /** Fresh Lime — CTA bg; pair with text.onPrimary (Deep Navy), never white text */
    primary: palette.lime500,
    primaryHover: palette.lime600,
    primaryDark: palette.lime600,
    secondary: palette.white,
    ghost: 'transparent',
    danger: palette.softRed,
    info: palette.skyBlue,
  },
  reward: {
    /** Coin / reward accents stay lime-forward in general UI */
    primary: palette.lime600,
    secondary: palette.lime500,
    light: palette.paleGreen,
    muted: palette.limeSoft,
  },
  navigation: {
    active: palette.lime600,
    inactive: palette.mutedText,
  },
  map: {
    accent: palette.skyBlue,
    accentSoft: palette.skySoft,
  },
  text: {
    primary: palette.deepNavy,
    secondary: palette.softNavy,
    tertiary: palette.mutedText,
    inverse: palette.white,
    /** Deep Navy on Fresh Lime CTA — WCAG AA target */
    onPrimary: palette.deepNavy,
    /**
     * @deprecated alias of onPrimary (Club Minimal “onGold” naming)
     */
    onGold: palette.deepNavy,
  },
  status: {
    success: palette.lime600,
    successSoft: palette.successSoft,
    warning: palette.softOrange,
    warningSoft: palette.softOrangeSoft,
    error: palette.softRed,
    errorSoft: palette.softRedSoft,
    info: palette.skyBlue,
    infoSoft: palette.skySoft,
  },
} as const;

/** Premium-only semantic tokens — do not use on general Home/Join/nav. */
export const premiumColors = {
  background: palette.premiumBg,
  surface: palette.premiumSurface,
  elevated: palette.premiumElevated,
  gold: palette.premiumGold,
  text: palette.premiumIvory,
  textMuted: palette.premiumMuted,
  border: palette.premiumBorder,
  badge: palette.premiumGoldMuted,
} as const;

/**
 * Legacy flat color tokens — kept for existing screen imports during migration.
 * Prefer `useTheme().colors` for new code.
 */
export const colors = {
  primary: palette.lime500,
  primarySoft: palette.paleGreen,
  background: palette.warmWhite,
  surface: palette.white,
  textPrimary: palette.deepNavy,
  textSecondary: palette.mutedText,
  /** @deprecated use theme text.tertiary in new code */
  muted: palette.mutedText,
  border: palette.borderLight,
  danger: palette.softRed,
  dangerSoft: palette.softRedSoft,
  warning: palette.softOrange,
  warningSoft: palette.softOrangeSoft,
  coin: palette.lime600,
  coinSoft: palette.paleGreen,
  overlay: 'rgba(23, 33, 43, 0.45)',
  white: palette.white,
} as const;

export type ColorToken = keyof typeof colors;
export type SemanticColors = typeof semanticColors;
export type PremiumColors = typeof premiumColors;
