import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';
import { DEFAULT_NEARBY_RADIUS_METERS, localDayKey } from '@jjoin/domain';
import { VenueType } from '@jjoin/types';
import type {
  ClubDetailDto,
  ClubSummaryDto,
  DiscoverJoinCardDto,
  GolfFriendCardDto,
  HomeBannerDto,
} from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore } from '../../../session/SessionContext';
import { fetchDiscoverJoins } from '../../explore/discovery/api/join-discover-api';
import { mergeHomeDiscoverRows, pickVenueDiscoverJoins } from '../home-format';

const HOME_DATA_STALE_MS = 60_000;
const HOME_JOIN_LIMIT = 3;
const HOME_USER_LIMIT = 3;

export type HomeDataState = {
  fieldJoins: DiscoverJoinCardDto[];
  screenJoins: DiscoverJoinCardDto[];
  clubs: ClubSummaryDto[];
  featuredClub: ClubDetailDto | null;
  banners: HomeBannerDto[];
  discoveryFriends: GolfFriendCardDto[];
  initialLoading: boolean;
  isRefreshing: boolean;
  discoverError: string | null;
  hasLoadedOnce: boolean;
  loadingClub: boolean;
};

type StableCoords = { lat: number; lng: number };

function roundCoord(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function useHomeData(userId: string | undefined, clubsUiEnabled = false) {
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [state, setState] = useState<HomeDataState>({
    fieldJoins: [],
    screenJoins: [],
    clubs: [],
    featuredClub: null,
    banners: [],
    discoveryFriends: [],
    initialLoading: true,
    isRefreshing: false,
    discoverError: null,
    hasLoadedOnce: false,
    loadingClub: true,
  });
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
        discoverError: null,
      }));

      const todayKey = localDayKey(new Date());
      const coords = await resolveCoords();

      const discoverTask = (async () => {
        if (!coords) return [] as DiscoverJoinCardDto[];
        const nearby = {
          date: todayKey,
          regionMode: 'NEARBY' as const,
          lat: coords.lat,
          lng: coords.lng,
          radiusMeters: DEFAULT_NEARBY_RADIUS_METERS,
          sort: 'TIME' as const,
          joinability: 'JOINABLE' as const,
        };
        try {
          // Omit venueType → SCREEN only. Home FIELD rail needs an explicit FIELD fetch.
          const [screenRes, fieldRes] = await Promise.all([
            fetchDiscoverJoins(api, { ...nearby, venueType: 'SCREEN' }),
            fetchDiscoverJoins(api, { ...nearby, venueType: 'FIELD' }),
          ]);
          return mergeHomeDiscoverRows(screenRes, fieldRes);
        } catch {
          return [] as DiscoverJoinCardDto[];
        }
      })();

      const clubsTask = clubsUiEnabled
        ? api.listMyClubs().catch(() => ({ items: [] }))
        : Promise.resolve({ items: [] });
      const bannersTask = api.listHomeBanners().catch(() => [] as HomeBannerDto[]);
      const profilesTask = api.getGolfFriendsRecommended().catch(() => ({ items: [] }));

      const [discoverResult, clubsResult, bannersResult, profilesResult] = await Promise.allSettled([
        discoverTask,
        clubsTask,
        bannersTask,
        profilesTask,
      ]);

      if (seq !== loadSeqRef.current) return;

      const discoverRows = discoverResult.status === 'fulfilled' ? discoverResult.value : [];
      const discoverFailed = discoverResult.status === 'rejected';
      const clubs = clubsResult.status === 'fulfilled' ? clubsResult.value.items : [];
      const banners = bannersResult.status === 'fulfilled' ? bannersResult.value : [];
      const discoveryFriends =
        profilesResult.status === 'fulfilled'
          ? profilesResult.value.items.slice(0, HOME_USER_LIMIT)
          : [];

      const fieldJoins = pickVenueDiscoverJoins(discoverRows, VenueType.FIELD, HOME_JOIN_LIMIT);
      const screenJoins = pickVenueDiscoverJoins(discoverRows, VenueType.SCREEN, HOME_JOIN_LIMIT);

      setState((prev) => ({
        ...prev,
        fieldJoins,
        screenJoins,
        clubs,
        banners,
        discoveryFriends,
        initialLoading: false,
        isRefreshing: false,
        hasLoadedOnce: true,
        discoverError:
          discoverFailed && prev.fieldJoins.length === 0 && prev.screenJoins.length === 0
            ? '조인 목록을 불러오지 못했습니다.'
            : null,
      }));

      lastFetchAtRef.current = Date.now();

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
    [api, clubsUiEnabled, resolveCoords],
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
