export const typography = {
  title: { fontSize: 22, lineHeight: 30, fontWeight: '700' as const },
  subtitle: { fontSize: 18, lineHeight: 26, fontWeight: '600' as const },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '600' as const },
  caption: { fontSize: 12, lineHeight: 18, fontWeight: '400' as const },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '500' as const },
} as const;

/** @deprecated alias kept for Figma naming parity */
export const typographyAliases = {
  subtitle: typography.subtitle,
  caption: typography.caption,
} as const;
