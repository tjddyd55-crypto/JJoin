/** Target font — load IBMPlexSansKR via expo-font in mobile bootstrap (Phase 1B). */
export const fontFamily = {
  sans: 'IBMPlexSansKR-Regular',
  sansMedium: 'IBMPlexSansKR-Medium',
  sansSemiBold: 'IBMPlexSansKR-SemiBold',
  sansBold: 'IBMPlexSansKR-Bold',
} as const;

export const typography = {
  display: {
    fontFamily: fontFamily.sansBold,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
  },
  headline: {
    fontFamily: fontFamily.sansBold,
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
  },
  screenTitle: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  },
  sectionTitle: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600' as const,
    letterSpacing: 0,
  },
  venueTitle: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600' as const,
    letterSpacing: 0,
  },
  body: {
    fontFamily: fontFamily.sans,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400' as const,
    letterSpacing: 0,
  },
  bodyStrong: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600' as const,
    letterSpacing: 0,
  },
  meta: {
    fontFamily: fontFamily.sans,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as const,
    letterSpacing: 0,
  },
  caption: {
    fontFamily: fontFamily.sans,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '400' as const,
    letterSpacing: 0.1,
  },
  coinLarge: {
    fontFamily: fontFamily.sansBold,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
  },
  coinMedium: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600' as const,
    letterSpacing: 0,
  },
  button: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600' as const,
    letterSpacing: 0.1,
  },
  navLabel: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '500' as const,
    letterSpacing: 0.2,
  },
  /** @deprecated use sectionTitle */
  title: {
    fontFamily: fontFamily.sansBold,
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
  },
  /** @deprecated use sectionTitle */
  subtitle: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600' as const,
    letterSpacing: 0,
  },
  /** @deprecated use meta */
  label: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500' as const,
    letterSpacing: 0,
  },
} as const;

export type TypographyVariant = keyof typeof typography;

/** @deprecated alias kept for Figma naming parity */
export const typographyAliases = {
  subtitle: typography.subtitle,
  caption: typography.caption,
} as const;
