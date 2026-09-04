export const sizes = {
  button: {
    sm: 40,
    md: 48,
    lg: 56,
  },
  input: {
    md: 48,
    lg: 52,
  },
  icon: {
    sm: 16,
    md: 20,
    lg: 24,
  },
  avatar: {
    sm: 32,
    md: 48,
    lg: 72,
    joinHost: 56,
    joinHostLg: 64,
  },
  appBar: 56,
  bottomNav: 64,
  touchTarget: 44,
  sheetHandle: {
    width: 40,
    height: 4,
  },
} as const;

/** @deprecated use sizes — kept for backward compatibility */
export const sizing = {
  avatarSm: sizes.avatar.sm,
  avatarMd: sizes.avatar.md,
  avatarLg: sizes.avatar.lg,
  touchTarget: sizes.touchTarget,
  bottomNavHeight: sizes.bottomNav,
  appBarHeight: sizes.appBar,
} as const;

export type SizeToken = keyof typeof sizes;
