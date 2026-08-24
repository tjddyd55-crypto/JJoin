/** Numeric spacing scale — use token keys, not raw numbers in screens. */
export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/** Semantic layout spacing from Figma Club Minimal Handoff. */
export const layoutSpacing = {
  /** Default screen horizontal padding @390 */
  screenHorizontal: 20,
  /** Compact screen horizontal padding @360 */
  screenHorizontalCompact: 16,
  cardGap: 12,
  cardPadding: 16,
  sectionGap: 24,
  formFieldGap: 12,
  bottomNavInset: 8,
} as const;

export type SpacingToken = keyof typeof spacing;
export type LayoutSpacingToken = keyof typeof layoutSpacing;
