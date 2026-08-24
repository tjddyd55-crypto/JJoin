import {
  semanticColors,
  layoutSpacing,
  spacing,
  radius,
  sizes,
  typography,
  opacity,
  shadows,
  palette,
} from '../tokens';

export const clubMinimalTheme = {
  name: 'clubMinimal' as const,
  colors: semanticColors,
  palette,
  spacing,
  layoutSpacing,
  radius,
  sizes,
  typography,
  opacity,
  shadows,
} as const;

export type ClubMinimalTheme = typeof clubMinimalTheme;
