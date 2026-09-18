import type { FeatureFlagDto } from '@jjoin/types';
import type { PushRouteTarget } from '../notifications/push-routing';

export function isClubsUiEnabled(flags?: FeatureFlagDto | null): boolean {
  return flags?.clubsUiEnabled === true;
}

export function clubHrefOrUnavailable(
  flags: FeatureFlagDto | null | undefined,
  href: string,
): string {
  return isClubsUiEnabled(flags) ? href : '/unavailable';
}

export function applyClubsUiGateToPushRoute(
  target: PushRouteTarget,
  flags?: FeatureFlagDto | null,
): PushRouteTarget {
  if (target.kind === 'club' || target.kind === 'club-notice') {
    if (!isClubsUiEnabled(flags)) return { kind: 'unavailable' };
  }
  return target;
}
