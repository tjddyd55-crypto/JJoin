/**
 * Bright Social Sports primitive palette — screens must not import this directly.
 * Use semantic tokens via `useTheme().colors` (or `theme.premium` for Premium surfaces).
 */
export const palette = {
  // --- Bright Social Sports core ---
  warmWhite: '#F8F9F6',
  white: '#FFFFFF',
  deepNavy: '#17212B',
  secondaryText: '#59636C',
  mutedText: '#7D858C',
  borderLight: '#E2E6E1',
  softSurface: '#F1F3EF',

  /** UI active / success green — not for large fills or body text on white alone */
  activeGreen: '#4F7F3A',
  selectedSurface: '#EFF6E9',
  selectedText: '#365F2A',
  paleGreen: '#EFF8E7',

  /** Info — dark blue for text/links; bright sky for decorative only */
  infoBlue: '#3278A8',
  infoSurface: '#EAF4FA',
  skyBlue: '#59B7F7',
  skySoft: 'rgba(89, 183, 247, 0.16)',

  /** Brand accent only — logo dot, icon plate, tiny decoration. Not general UI primary. */
  limeAccent: '#9BCB5A',
  /** @deprecated App icon plate only — do not use in general UI */
  lime500: '#A7E65B',

  softNavy: '#2A3642',
  softOrange: '#E8A04D',
  softOrangeSoft: 'rgba(232, 160, 77, 0.16)',
  softRed: '#E05252',
  softRedSoft: 'rgba(224, 82, 82, 0.14)',
  successSoft: 'rgba(79, 127, 58, 0.14)',
  limeSoft: 'rgba(155, 203, 90, 0.22)',
  navyMuted: 'rgba(23, 33, 43, 0.08)',

  // --- Premium / archived Black & Gold (Premium surfaces only) ---
  premiumBg: '#0B0B0C',
  premiumSurface: '#171719',
  premiumElevated: '#1D1D20',
  premiumGold: '#D4AF37',
  premiumGoldSoft: '#E3C76D',
  premiumGoldMuted: 'rgba(212, 175, 55, 0.35)',
  premiumIvory: '#F5F2EA',
  premiumMuted: '#B6B2AA',
  premiumTertiary: '#7D7A74',
  premiumBorder: '#2A2A2E',

  /**
   * @deprecated Club Minimal archive naming — Premium or migration only.
   */
  neutral950: '#0B0B0C',
  neutral900: '#111113',
  neutral850: '#171719',
  neutral800: '#1D1D20',
  neutral750: '#222225',
  neutral700: '#2A2A2E',
  neutral600: '#3A3A3F',
  neutral500: '#7D7A74',
  neutral400: '#9A9A9E',
  neutral300: '#B6B2AA',
  neutral100: '#F5F2EA',
  gold600: '#B8962E',
  gold500: '#D4AF37',
  gold400: '#E3C76D',
  gold300: '#C6A75E',
  goldMuted: 'rgba(212, 175, 55, 0.35)',
  lime600: '#66B83F',
  success500: '#4F7F3A',
  warning500: '#E8A04D',
  warningSoft: 'rgba(232, 160, 77, 0.16)',
  error500: '#E05252',
  errorSoft: 'rgba(224, 82, 82, 0.14)',
  info500: '#367FAF',
  infoSoft: 'rgba(54, 127, 175, 0.14)',
} as const;

export type PaletteToken = keyof typeof palette;
