import { palette } from './palette';

/**
 * Semantic Bright Social Sports — Navy-centered UI, lime relegated to brand accent only.
 * Premium Black & Gold: `premiumColors` / `theme.premium`.
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
    soft: palette.selectedSurface,
  },
  border: {
    subtle: palette.borderLight,
    strong: palette.mutedText,
  },
  action: {
    /** Primary CTA — Deep Navy fill, white label */
    primary: palette.deepNavy,
    primaryHover: palette.softNavy,
    primaryDark: palette.deepNavy,
    secondary: palette.white,
    ghost: 'transparent',
    danger: palette.softRed,
    info: palette.infoBlue,
  },
  brand: {
    /** Logo / icon plate / tiny decoration only — never body text or large UI fills */
    limeAccent: palette.limeAccent,
  },
  state: {
    active: palette.activeGreen,
    onActive: palette.white,
    selectedSurface: palette.selectedSurface,
    selectedText: palette.selectedText,
    selectedBorder: palette.activeGreen,
  },
  reward: {
    primary: palette.activeGreen,
    secondary: palette.selectedText,
    light: palette.selectedSurface,
    muted: palette.successSoft,
  },
  navigation: {
    active: palette.deepNavy,
    inactive: palette.mutedText,
    /** Small tab indicator dot — brand accent only */
    indicator: palette.limeAccent,
  },
  map: {
    accent: palette.infoBlue,
    accentSoft: palette.infoSurface,
  },
  text: {
    primary: palette.deepNavy,
    secondary: palette.secondaryText,
    tertiary: palette.mutedText,
    inverse: palette.white,
    /** On primary (navy) CTA */
    onPrimary: palette.white,
    link: palette.infoBlue,
    success: palette.selectedText,
    /**
     * @deprecated Use `text.onPrimary` (white on navy CTA). Kept for compile-time migration.
     */
    onGold: palette.white,
  },
  status: {
    success: palette.activeGreen,
    successSoft: palette.selectedSurface,
    warning: palette.softOrange,
    warningSoft: palette.softOrangeSoft,
    error: palette.softRed,
    errorSoft: palette.softRedSoft,
    info: palette.infoBlue,
    infoSoft: palette.infoSurface,
  },
  join: {
    status: {
      open: palette.activeGreen,
      openSurface: palette.selectedSurface,
      openText: palette.selectedText,
      urgent: palette.softOrange,
      urgentSurface: palette.softOrangeSoft,
      urgentText: palette.darkOrange,
      full: palette.mutedText,
      fullSurface: palette.softSurface,
      closed: palette.mutedText,
      closedSurface: palette.softSurface,
    },
    dday: {
      text: palette.infoBlue,
      surface: palette.infoSurface,
    },
    venue: palette.secondaryText,
    capacity: {
      available: palette.selectedText,
      lastSeat: palette.darkOrange,
      full: palette.mutedText,
    },
    surface: {
      info: palette.infoSurface,
    },
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
 * Legacy flat color tokens — migration only. New code: `useTheme().colors`.
 */
export const colors = {
  primary: palette.deepNavy,
  primarySoft: palette.selectedSurface,
  background: palette.warmWhite,
  surface: palette.white,
  textPrimary: palette.deepNavy,
  textSecondary: palette.secondaryText,
  muted: palette.mutedText,
  border: palette.borderLight,
  danger: palette.softRed,
  dangerSoft: palette.softRedSoft,
  warning: palette.softOrange,
  warningSoft: palette.softOrangeSoft,
  coin: palette.activeGreen,
  coinSoft: palette.selectedSurface,
  overlay: 'rgba(23, 33, 43, 0.45)',
  white: palette.white,
} as const;

export type ColorToken = keyof typeof colors;
export type SemanticColors = typeof semanticColors;
export type PremiumColors = typeof premiumColors;
