/**
 * Home banner carousel eligibility — admin-managed slides + optional store ads.
 */

export type HomeBannerLike = {
  id: string;
  active: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  sortOrder: number;
};

export function isHomeBannerVisible(banner: HomeBannerLike, now: Date): boolean {
  if (!banner.active) return false;
  if (banner.startsAt && banner.startsAt.getTime() > now.getTime()) return false;
  if (banner.endsAt && banner.endsAt.getTime() <= now.getTime()) return false;
  return true;
}

export function sortHomeBanners<T extends HomeBannerLike>(banners: T[]): T[] {
  return [...banners].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.id.localeCompare(b.id);
  });
}

export function selectVisibleHomeBanners<T extends HomeBannerLike>(
  banners: T[],
  now: Date,
): T[] {
  return sortHomeBanners(banners.filter((b) => isHomeBannerVisible(b, now)));
}

export const HOME_BANNER_AUTO_SLIDE_MS = 5000;
export const HOME_BANNER_TITLE_MAX = 60;
export const HOME_BANNER_SUBTITLE_MAX = 120;
