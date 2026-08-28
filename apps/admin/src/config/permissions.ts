import { AdminPermission } from '@jjoin/types';

/** PHASE B: binary admin gate — expose all permission codes for nav wiring. */
export const ALL_ADMIN_PERMISSIONS: AdminPermission[] = Object.values(AdminPermission);

export { AdminPermission };

export function hasAdminPermission(
  granted: readonly AdminPermission[] | 'ALL',
  required: AdminPermission,
): boolean {
  if (granted === 'ALL') return true;
  return granted.includes(required);
}
