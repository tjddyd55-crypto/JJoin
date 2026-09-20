import { listFieldSigunguChoices, type FieldCityCounty } from '@jjoin/domain';
import type { FieldNotificationRegionDto } from '@jjoin/types';

/** Full catalog for the selected province. UI must not slice this list. */
export function listCustomFieldCityChoices(province: string): FieldCityCounty[] {
  return listFieldSigunguChoices(province);
}

export function isFieldRegionSelected(
  current: FieldNotificationRegionDto[],
  target: FieldNotificationRegionDto,
): boolean {
  return current.some(
    (region) => region.province === target.province && region.cityCounty === target.cityCounty,
  );
}

export function toggleFieldNotificationRegion(
  current: FieldNotificationRegionDto[],
  target: FieldNotificationRegionDto,
): FieldNotificationRegionDto[] {
  if (isFieldRegionSelected(current, target)) {
    return current.filter(
      (region) => !(region.province === target.province && region.cityCounty === target.cityCounty),
    );
  }
  return [...current, target];
}

export function formatFieldNotificationRegions(regions: FieldNotificationRegionDto[]): string {
  if (regions.length === 0) return '아직 집 지역이 없습니다';
  return regions
    .map((region) => (region.cityCounty ? `${region.province} ${region.cityCounty}` : region.province))
    .join(', ');
}
