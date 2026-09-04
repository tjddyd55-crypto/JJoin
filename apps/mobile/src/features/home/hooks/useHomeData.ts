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

const HOME_DATA_STALE_MS = 60_000;

export type HomeDataState = {
  todayJoins: DiscoverJoinCardDto[];
  urgentJoins: ReturnType<typeof pickUrgentJoins>;
  recommended: RecommendedJoinDto[];
  clubs: ClubSummaryDto[];
  featuredClub: ClubDetailDto | null;
  initialLoading: boolean;
  isRefreshing: boolean;
  recommendError: string | null;
  hasLoadedOnce: boolean;
  loadingClub: boolean;
};

type StableCoords = { lat: number; lng: number };

function roundCoord(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function useHomeData(userId: string | undefined) {
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [state, setState] = useState<HomeDataState>({
    todayJoins: [],
    urgentJoins: [],
    recommended: [],
    clubs: [],
    featuredClub: null,
    initialLoading: true,
    isRefreshing: false,
    recommendError: null,
    hasLoadedOnce: false,
    loadingClub: true,
  });
  const impressedRef = useRef(new Set<string>());
  const loadSeqRef = useRef(0);
  const lastFetchAtRef = useRef(0);
  const coordsRef = useRef<StableCoords | null>(null);

  const resolveCoords = useCallback(async (): Promise<StableCoords | null> => {
    if (coordsRef.current) return coordsRef.current;
    const permission = await Location.getForegroundPermissionsAsync();
    if (permission.status !== 'granted') return null;
    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      coordsRef.current = {
        lat: roundCoord(pos.coords.latitude),
        lng: roundCoord(pos.coords.longitude),
      };
      return coordsRef.current;
    } catch {
      return null;
    }
  }, []);

  const load = useCallback(
    async (mode: 'initial' | 'refresh') => {
      const seq = ++loadSeqRef.current;
      setState((prev) => ({
        ...prev,
        initialLoading: mode === 'initial' && !prev.hasLoadedOnce,
        isRefreshing: mode === 'refresh' && prev.hasLoadedOnce,
        recommendError: null,
      }));

      const todayKey = localDayKey(new Date());
      const coords = await resolveCoords();

      const discoverTask = (async () => {
        if (!coords) return [] as DiscoverJoinCardDto[];
        try {
          const res = await fetchDiscoverJoins(api, {
            date: todayKey,
            regionMode: 'NEARBY',
            lat: coords.lat,
            lng: coords.lng,
            radiusMeters: DEFAULT_NEARBY_RADIUS_METERS,
            sort: 'TIME',
            joinability: 'JOINABLE',
          });
          return [...res.ongoing, ...res.upcoming];
        } catch {
          return [] as DiscoverJoinCardDto[];
        }
      })();

      const recommendedTask = (async () => {
        try {
          return await api.getRecommendedJoins({
            limit: 5,
            lat: coords?.lat,
            lng: coords?.lng,
          });
        } catch {
          return { items: [] as RecommendedJoinDto[] };
        }
      })();

      const clubsTask = api.listMyClubs().catch(() => ({ items: [] }));

      const [discoverResult, recommendedResult, clubsResult] = await Promise.allSettled([
        discoverTask,
        recommendedTask,
        clubsTask,
      ]);

      if (seq !== loadSeqRef.current) return;

      const discoverRows =
        discoverResult.status === 'fulfilled' ? discoverResult.value : [];
      const recommended =
        recommendedResult.status === 'fulfilled' ? recommendedResult.value.items : [];
      const recommendFailed = recommendedResult.status === 'rejected';
      const clubs = clubsResult.status === 'fulfilled' ? clubsResult.value.items : [];

      const todayJoins = pickTodayDiscoverJoins(discoverRows, 3);
      const urgentJoins = pickUrgentJoins(discoverRows, recommended, 1);
      const nextRecommended = recommended.slice(0, 3);

      setState((prev) => ({
        ...prev,
        todayJoins,
        urgentJoins,
        recommended: nextRecommended,
        clubs,
        initialLoading: false,
        isRefreshing: false,
        hasLoadedOnce: true,
        recommendError:
          recommendFailed && prev.recommended.length === 0 && nextRecommended.length === 0
            ? '추천 조인을 불러오지 못했습니다.'
            : null,
      }));

      lastFetchAtRef.current = Date.now();

      if (userId) {
        for (const item of nextRecommended) {
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
        if (seq !== loadSeqRef.current) return;
        setState((prev) => ({ ...prev, featuredClub: detail, loadingClub: false }));
      } catch {
        if (seq !== loadSeqRef.current) return;
        setState((prev) => ({ ...prev, featuredClub: null, loadingClub: false }));
      }
    },
    [api, resolveCoords, userId],
  );

  const reload = useCallback(() => {
    void load(state.hasLoadedOnce ? 'refresh' : 'initial');
  }, [load, state.hasLoadedOnce]);

  useFocusEffect(
    useCallback(() => {
      const stale = Date.now() - lastFetchAtRef.current > HOME_DATA_STALE_MS;
      if (!state.hasLoadedOnce || stale) {
        void load(state.hasLoadedOnce ? 'refresh' : 'initial');
      }
    }, [load, state.hasLoadedOnce]),
  );

  return { ...state, reload };
}
