import { AdminPermission } from './permissions';

export type NavItem = {
  id: string;
  path: string;
  label: string;
  permission: AdminPermission;
  /** When false, route renders FuturePage and nav shows 준비 중. */
  enabled: boolean;
  future?: boolean;
};

/**
 * Admin sidebar SSOT. Keep labels Korean; path is the route key.
 * Membership: PREMIUM = ROOM_CREATION_FEE_WAIVER only (no fake FREE/PREMIUM plans).
 */
export const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    path: '/',
    label: '대시보드',
    permission: AdminPermission.MEMBER_VIEW,
    enabled: true,
  },
  {
    id: 'members',
    path: '/members',
    label: '회원 관리',
    permission: AdminPermission.MEMBER_VIEW,
    enabled: true,
  },
  {
    id: 'joins',
    path: '/joins',
    label: '조인 관리',
    permission: AdminPermission.JOIN_VIEW,
    enabled: true,
  },
  {
    id: 'coin',
    path: '/coin',
    label: '코인 관리',
    permission: AdminPermission.COIN_VIEW,
    enabled: true,
  },
  {
    id: 'disputes',
    path: '/disputes',
    label: '분쟁 / 신고',
    permission: AdminPermission.DISPUTE_VIEW,
    enabled: true,
  },
  {
    id: 'venues',
    path: '/venues',
    label: '장소 / 매장',
    permission: AdminPermission.VENUE_VIEW,
    enabled: true,
  },
  {
    id: 'ops',
    path: '/ops',
    label: '알림 / 운영',
    permission: AdminPermission.OPS_VIEW,
    enabled: false,
    future: true,
  },
  {
    id: 'memberships',
    path: '/memberships',
    label: '멤버십 관리',
    permission: AdminPermission.MEMBERSHIP_VIEW,
    enabled: true,
  },
  {
    id: 'audit',
    path: '/audit',
    label: '감사 로그',
    permission: AdminPermission.AUDIT_VIEW,
    enabled: true,
  },
];

export function findNavItem(pathname: string): NavItem | undefined {
  if (pathname === '/') return NAV_ITEMS.find((n) => n.path === '/');
  return NAV_ITEMS.find((n) => n.path !== '/' && pathname.startsWith(n.path));
}
