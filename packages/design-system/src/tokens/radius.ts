export const radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  joinCard: 18,
  xl: 20,
  sheet: 24,
  full: 999,
} as const;

export type RadiusToken = keyof typeof radius;
