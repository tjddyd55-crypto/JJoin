export type ProfileAvatarSize = 'sm' | 'md' | 'lg';

export function resolveProfileAvatarPixel(
  size: ProfileAvatarSize,
  avatarSizes: { joinHost: number; joinHostLg: number },
): number {
  if (size === 'lg') return avatarSizes.joinHostLg;
  if (size === 'sm') return 44;
  return avatarSizes.joinHost;
}
