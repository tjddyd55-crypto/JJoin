import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';
import { DEFAULT_NEARBY_RADIUS_METERS, localDayKey } from '@jjoin/domain';
import type {
  ClubDetailDto,
  ClubSummaryDto,
  DiscoverJoinCardDto,
  RecommendedJoinDto,
} from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import { trackRecommendationImpression } from '../../../lib/product-analytics';
import { getSecureSessionStore } from '../../../session/SessionContext';
import { fetchDiscoverJoins } from '../../explore/discovery/api/join-discover-api';
import { pickTodayDiscoverJoins, pickUrgentJoins } from '../home-format';

export type HomeDataState = {
  todayJoins: DiscoverJoinCardDto[];
  urgentJoins: ReturnType<typeof pickUrgentJoins>;
  recommended: RecommendedJoinDto[];
  clubs: ClubSummaryDto[];
  featuredClub: ClubDetailDto | null;
  loadingToday: boolean;
  loadingRecommended: boolean;
  loadingClub: boolean;
};

const EMPTY: HomeDataState = {
  todayJoins: [],
  urgentJoins: [],
  recommended: [],
  clubs: [],
  featuredClub: null,
  loadingToday: true,
  loadingRecommended: true,
  loadingClub: true,
};

export function useHomeData(userId: string | undefined) {
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [state, setState] = useState<HomeDataState>(EMPTY);
  const impressedRef = useRef(new Set<string>());

  const load = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      loadingToday: true,
      loadingRecommended: true,
      loadingClub: true,
    }));

    const todayKey = localDayKey(new Date());
    let discoverRows: DiscoverJoinCardDto[] = [];

    const discoverTask = (async () => {
      try {
        const permission = await Location.getForegroundPermissionsAsync();
        if (permission.status !== 'granted') return [];
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const res = await fetchDiscoverJoins(api, {
          date: todayKey,
          regionMode: 'NEARBY',
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          radiusMeters: DEFAULT_NEARBY_RADIUS_METERS,
          sort: 'TIME',
          joinability: 'JOINABLE',
        });
        return [...res.ongoing, ...res.upcoming];
      } catch {
        return [];
      }
    })();

    const recommendedTask = api.getRecommendedJoins({ limit: 5 }).catch(() => ({ items: [] }));
    const clubsTask = api.listMyClubs().catch(() => ({ items: [] }));

    const [discoverResult, recommendedResult, clubsResult] = await Promise.allSettled([
      discoverTask,
      recommendedTask,
      clubsTask,
    ]);

    if (discoverResult.status === 'fulfilled') {
      discoverRows = discoverResult.value;
    }
    const recommended =
      recommendedResult.status === 'fulfilled' ? recommendedResult.value.items : [];
    const clubs = clubsResult.status === 'fulfilled' ? clubsResult.value.items : [];

    const todayJoins = pickTodayDiscoverJoins(discoverRows, 2);
    const urgentJoins = pickUrgentJoins(discoverRows, recommended, 1);

    setState((prev) => ({
      ...prev,
      todayJoins,
      urgentJoins,
      recommended: recommended.slice(0, 3),
      clubs,
      loadingToday: false,
      loadingRecommended: false,
    }));

    if (userId) {
      for (const item of recommended.slice(0, 3)) {
        if (impressedRef.current.has(item.joinId)) continue;
        impressedRef.current.add(item.joinId);
        trackRecommendationImpression(api, userId, item.joinId, 'home');
      }
    }

    const activeClub = clubs.find((c) => c.myStatus === 'ACTIVE') ?? clubs[0] ?? null;
    if (!activeClub) {
      setState((prev) => ({ ...prev, featuredClub: null, loadingClub: false }));
      return;
    }

    try {
      const detail = await api.getClubDetail(activeClub.id);
      setState((prev) => ({ ...prev, featuredClub: detail, loadingClub: false }));
    } catch {
      setState((prev) => ({ ...prev, featuredClub: null, loadingClub: false }));
    }
  }, [api, userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return state;
}
