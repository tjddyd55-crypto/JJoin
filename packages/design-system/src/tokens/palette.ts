/**
 * Bright Social Sports primitive palette — screens must not import this directly.
 * Use semantic tokens via `useTheme().colors` (or `theme.premium` for Premium surfaces).
 *
 * Archived Black & Gold primitives remain under `premium*` for Premium-only UI.
 */
export const palette = {
  // --- Bright Social Sports core ---
  warmWhite: '#F8F9F6',
  white: '#FFFFFF',
  deepNavy: '#17212B',
  lime500: '#A7E65B',
  lime600: '#66B83F',
  skyBlue: '#59B7F7',
  paleGreen: '#EFF8E7',
  borderLight: '#E5E8E3',
  mutedText: '#7D858C',
  softNavy: '#2A3642',
  softSurface: '#F1F3EF',
  softOrange: '#E8A04D',
  softOrangeSoft: 'rgba(232, 160, 77, 0.16)',
  softRed: '#E05252',
  softRedSoft: 'rgba(224, 82, 82, 0.14)',
  skySoft: 'rgba(89, 183, 247, 0.16)',
  limeSoft: 'rgba(167, 230, 91, 0.28)',
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
   * @deprecated Prefer semantic Bright tokens. Kept for transitional imports /
   * Club Minimal archive naming in tests and Premium helpers.
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
  success500: '#66B83F',
  successSoft: 'rgba(102, 184, 63, 0.16)',
  warning500: '#E8A04D',
  warningSoft: 'rgba(232, 160, 77, 0.16)',
  error500: '#E05252',
  errorSoft: 'rgba(224, 82, 82, 0.14)',
  info500: '#59B7F7',
  infoSoft: 'rgba(89, 183, 247, 0.16)',
} as const;

export type PaletteToken = keyof typeof palette;
