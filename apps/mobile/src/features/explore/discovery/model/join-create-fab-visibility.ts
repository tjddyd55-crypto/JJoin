import type { JoinCreatorUserType } from '@jjoin/types';

/** Home/join FAB — 일반 회원은 조인 만들기 진입을 숨긴다. */
export function shouldShowJoinCreateFab(
  creatorUserType: JoinCreatorUserType | undefined,
): boolean {
  return creatorUserType === 'STORE_OWNER' || creatorUserType === 'PREMIUM';
}
