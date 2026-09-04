import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import {
  DEFAULT_NEARBY_RADIUS_METERS,
  DEFAULT_REGION_QUICK_PICKS,
  regionIdentityKey,
  sundayOfWeek,
  type AdminDistrict,
} from '@jjoin/domain';
import { getSecureSessionStore } from '../../../../session/SessionContext';
import { getApiClient } from '../../../../lib/api';
import { useJoinDiscovery } from '../JoinDiscoveryContext';
import {
  fetchDiscoverWeeklyCounts,
  fetchJoinRegionPreferences,
  saveJoinRegionPreference,
} from '../api/join-discover-api';
import { WeekStrip } from './WeekStrip';
import { RegionQuickPicks, type RegionChip } from './RegionQuickPicks';
import { RegionPickerSheet } from './RegionPickerSheet';

type Props = {
  locationDenied: boolean;
  deviceLocation: { latitude: number; longitude: number } | null;
  regionPickerOpen?: boolean;
  onRegionPickerOpenChange?: (open: boolean) => void;
};

export function DiscoveryFilterChrome({
  locationDenied,
  deviceLocation,
  regionPickerOpen,
  onRegionPickerOpenChange,
}: Props) {
  const { filter, setDate, setRegion, shiftWeek } = useJoinDiscovery();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dayCounts, setDayCounts] = useState<Record<string, number>>({});
  const [prefChips, setPrefChips] = useState<RegionChip[]>([]);

  const chips: RegionChip[] = useMemo(() => {
    const nearbyDisabled = locationDenied && !deviceLocation;
    const base: RegionChip[] = [
      {
        key: 'NEARBY',
        region: { mode: 'NEARBY', label: '내 주변' },
        disabled: nearbyDisabled,
      },
    ];
    const seen = new Set<string>(['NEARBY']);
    for (const p of prefChips) {
      if (seen.has(p.key)) continue;
      seen.add(p.key);
      base.push(p);
    }
    for (const d of DEFAULT_REGION_QUICK_PICKS) {
      const key = `DISTRICT:${d.sido}|${d.sigungu}`;
      if (seen.has(key)) continue;
      seen.add(key);
      base.push({
        key,
        region: {
          mode: 'DISTRICT',
          sido: d.sido,
          sigungu: d.sigungu,
          label: d.label,
        },
      });
    }
    return base.slice(0, 5);
  }, [prefChips, locationDenied, deviceLocation]);

  const loadPrefs = useCallback(async () => {
    try {
      const res = await fetchJoinRegionPreferences(api);
      setPrefChips(
        res.items.map((item) => ({
          key: `DISTRICT:${item.sido}|${item.sigungu}`,
          region: {
            mode: 'DISTRICT' as const,
            sido: item.sido,
            sigungu: item.sigungu,
            label: item.label,
          },
        })),
      );
    } catch {
      setPrefChips([]);
    }
  }, [api]);

  useEffect(() => {
    void loadPrefs();
  }, [loadPrefs]);

  useEffect(() => {
    if (regionPickerOpen) {
      setPickerOpen(true);
      onRegionPickerOpenChange?.(false);
    }
  }, [regionPickerOpen, onRegionPickerOpenChange]);

  useEffect(() => {
    const abort = new AbortController();
    void (async () => {
      try {
        if (filter.region.mode === 'NEARBY' && !deviceLocation) {
          setDayCounts({});
          return;
        }
        const regionQuery =
          filter.region.mode === 'NEARBY'
            ? {
                regionMode: 'NEARBY' as const,
                lat: deviceLocation!.latitude,
                lng: deviceLocation!.longitude,
                radiusMeters: DEFAULT_NEARBY_RADIUS_METERS,
              }
            : {
                regionMode: 'DISTRICT' as const,
                sido: filter.region.sido,
                sigungu: filter.region.sigungu,
              };
        const weekly = await fetchDiscoverWeeklyCounts(
          api,
          { weekStart: sundayOfWeek(filter.weekAnchorDate), ...regionQuery },
          abort.signal,
        );
        const counts: Record<string, number> = {};
        for (const day of weekly.days) counts[day.date] = day.count;
        setDayCounts(counts);
      } catch {
        if (!abort.signal.aborted) setDayCounts({});
      }
    })();
    return () => abort.abort();
  }, [api, filter.region, filter.weekAnchorDate, deviceLocation]);

  return (
    <View>
      <WeekStrip
        weekAnchorDate={filter.weekAnchorDate}
        selectedDate={filter.date}
        dayCounts={dayCounts}
        onSelectDate={setDate}
        onPrevWeek={() => shiftWeek(-1)}
        onNextWeek={() => shiftWeek(1)}
      />
      <RegionQuickPicks
        chips={chips}
        selectedKey={regionIdentityKey(filter.region)}
        onSelect={(region) => {
          if (region.mode === 'NEARBY' && locationDenied && !deviceLocation) {
            return;
          }
          setRegion(region);
        }}
        onChangeRegion={() => setPickerOpen(true)}
      />
      <RegionPickerSheet
        visible={pickerOpen}
        onClose={() => {
          setPickerOpen(false);
          onRegionPickerOpenChange?.(false);
        }}
        onSelect={(d: AdminDistrict) => {
          setRegion({
            mode: 'DISTRICT',
            sido: d.sido,
            sigungu: d.sigungu,
            label: d.label,
          });
        }}
        onSaveFavorite={(d) => {
          void saveJoinRegionPreference(api, {
            sido: d.sido,
            sigungu: d.sigungu,
            label: d.label,
          }).then(() => loadPrefs());
        }}
      />
    </View>
  );
}
