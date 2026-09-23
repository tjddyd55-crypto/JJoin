type AvatarProfile = {
  avatarAsset?: { storageKey: string } | null;
} | null;

/**
 * Join detail host photos come from the host profile asset.
 * Fall back to the host roster row, which already loads avatarAsset.
 */
export function resolveJoinDetailHostAvatarKey(join: {
  host: { id: string; profile: AvatarProfile };
  participants: Array<{
    role: string;
    userId: string;
    user: { profile: AvatarProfile };
  }>;
}): string | null {
  const fromHost = join.host.profile?.avatarAsset?.storageKey?.trim();
  if (fromHost) return fromHost;
  const hostParticipant = join.participants.find(
    (participant) => participant.role === 'HOST' || participant.userId === join.host.id,
  );
  const fromRoster = hostParticipant?.user.profile?.avatarAsset?.storageKey?.trim();
  return fromRoster || null;
}
