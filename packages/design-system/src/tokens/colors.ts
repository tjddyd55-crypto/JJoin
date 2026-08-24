import { palette } from './palette';

/** Semantic Club Minimal colors — preferred for new code via useTheme(). */
export const semanticColors = {
  app: {
    background: palette.neutral950,
  },
  surface: {
    base: palette.neutral900,
    card: palette.neutral850,
    elevated: palette.neutral800,
    floating: palette.neutral750,
  },
  border: {
    subtle: palette.neutral700,
    strong: palette.neutral600,
  },
  action: {
    primary: palette.gold500,
    primaryHover: palette.gold400,
    secondary: palette.neutral850,
    ghost: 'transparent',
    danger: palette.error500,
  },
  reward: {
    primary: palette.gold500,
    secondary: palette.gold600,
    light: palette.gold400,
    muted: palette.goldMuted,
  },
  navigation: {
    active: palette.gold500,
    inactive: palette.neutral500,
  },
  text: {
    primary: palette.neutral100,
    secondary: palette.neutral300,
    tertiary: palette.neutral500,
    inverse: palette.neutral950,
    onGold: palette.neutral950,
  },
  status: {
    success: palette.success500,
    successSoft: palette.successSoft,
    warning: palette.warning500,
    warningSoft: palette.warningSoft,
    error: palette.error500,
    errorSoft: palette.errorSoft,
    info: palette.info500,
    infoSoft: palette.infoSoft,
  },
} as const;

/**
 * Legacy flat color tokens — kept for existing screen imports during migration.
 * New code should use `useTheme().colors` instead.
 */
export const colors = {
  primary: '#0A6B56',
  primarySoft: '#E0F2ED',
  background: '#F5F6F8',
  surface: '#FFFFFF',
  textPrimary: '#1C2128',
  textSecondary: '#6B7280',
  /** @deprecated use theme text.tertiary in new code */
  muted: '#9CA3AF',
  border: '#E5E7EB',
  danger: '#C0392B',
  dangerSoft: '#FDECEC',
  warning: '#B86B14',
  warningSoft: '#FFF4E5',
  coin: '#26748C',
  coinSoft: '#E8F4F7',
  overlay: 'rgba(20, 22, 26, 0.55)',
  white: '#FFFFFF',
} as const;

export type ColorToken = keyof typeof colors;
export type SemanticColors = typeof semanticColors;
