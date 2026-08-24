export const opacity = {
  disabled: 0.4,
  pressed: 0.85,
  muted: 0.6,
  overlay: 0.55,
} as const;

export type OpacityToken = keyof typeof opacity;
