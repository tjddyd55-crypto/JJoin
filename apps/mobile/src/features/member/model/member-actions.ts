export function isOwnMemberProfile(viewerUserId: string | null | undefined, targetUserId: string) {
  return Boolean(viewerUserId && targetUserId && viewerUserId === targetUserId);
}
