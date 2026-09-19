export function isOwnMemberProfile(viewerUserId: string | null | undefined, targetUserId: string) {
  return Boolean(viewerUserId && targetUserId && viewerUserId === targetUserId);
}

/** Route `nickname` is untrusted; confirm only after the public profile loads. */
export function resolveBoundGiftRecipientName(serverNickname: string | null | undefined): string | null {
  const name = serverNickname?.trim();
  return name ? name : null;
}
