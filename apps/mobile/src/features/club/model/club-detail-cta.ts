import { ClubJoinMode, ClubMembershipStatus, type ClubDetailDto } from '@jjoin/types';

export type ClubDetailCtaPresentation =
  | 'apply'
  | 'instant_join'
  | 'pending'
  | 'manage'
  | 'members';

export type ClubDetailPrimaryCta = {
  label: string;
  presentation: ClubDetailCtaPresentation;
  disabled: boolean;
};

export function shouldShowClubDetailStickyCta(presentation: ClubDetailCtaPresentation): boolean {
  return presentation !== 'members';
}

export function resolveClubDetailPrimaryCta({
  detail,
  isStaff,
}: {
  detail: ClubDetailDto;
  isStaff: boolean;
}): ClubDetailPrimaryCta {
  if (isStaff) {
    return { label: '동호회 관리', presentation: 'manage', disabled: false };
  }
  if (detail.myStatus === ClubMembershipStatus.PENDING) {
    return { label: '승인 대기 중', presentation: 'pending', disabled: true };
  }
  if (detail.myStatus === ClubMembershipStatus.ACTIVE) {
    return { label: '멤버 보기', presentation: 'members', disabled: false };
  }
  if (detail.joinMode === ClubJoinMode.INSTANT) {
    return { label: '동호회 가입', presentation: 'instant_join', disabled: false };
  }
  return { label: '가입 신청', presentation: 'apply', disabled: false };
}
