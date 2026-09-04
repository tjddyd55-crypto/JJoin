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
  /** Figma JOIN — screen title (조인) */
  joinScreenTitle: {
    fontFamily: fontFamily.sansBold,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
  },
  /** Figma JOIN — section headings (20/28 Bold) */
  joinSectionTitle: {
    fontFamily: fontFamily.sansBold,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700' as const,
    letterSpacing: 0,
  },
  /** Figma JOIN — card title (18/24 Semibold) */
  joinCardTitle: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600' as const,
    letterSpacing: 0,
  },
  /** Figma JOIN — meta rows (14/20) */
  joinMeta: {
    fontFamily: fontFamily.sans,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
    letterSpacing: 0,
  },
  /** Figma JOIN — filter/tab chip (12/16 Semibold) */
  joinFilterChip: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600' as const,
    letterSpacing: 0,
  },
  /** Figma JOIN — text tab label (13/18 Semibold) */
  joinTabLabel: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 13,
    lineHeight: 18,
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
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500' as const,
    letterSpacing: 0.2,
  },
  cardTitle: {
    fontFamily: fontFamily.sansSemiBold,
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '600' as const,
    letterSpacing: 0,
  },
  quickMenuLabel: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500' as const,
    letterSpacing: 0,
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
