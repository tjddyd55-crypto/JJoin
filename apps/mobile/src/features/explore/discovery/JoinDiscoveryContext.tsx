import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  createDefaultDiscoveryFilter,
  shiftWeekAnchor,
  sundayOfWeek,
  type JoinDiscoveryRegion,
} from '@jjoin/domain';
import {
  createInitialDiscoveryUiState,
  type DiscoveryFilterPatch,
  type JoinDiscoveryUiState,
} from './model/discovery-filter';
import {
  loadRecentDiscoveryRegion,
  saveRecentDiscoveryRegion,
} from './model/recent-region';

type JoinDiscoveryContextValue = {
  filter: JoinDiscoveryUiState;
  patchFilter: (patch: DiscoveryFilterPatch) => void;
  setDate: (date: string) => void;
  setRegion: (region: JoinDiscoveryRegion) => void;
  shiftWeek: (deltaWeeks: number) => void;
  resetToTodayNearby: () => void;
};

const JoinDiscoveryContext = createContext<JoinDiscoveryContextValue | null>(
  null,
);

export function JoinDiscoveryProvider({ children }: { children: ReactNode }) {
  const [filter, setFilter] = useState<JoinDiscoveryUiState>(() =>
    createInitialDiscoveryUiState(),
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const recent = await loadRecentDiscoveryRegion();
      if (cancelled || !recent || recent.mode === 'NEARBY') return;
      // First entry default stays NEARBY; recent district only seeds quick picks via prefs API.
      // Persist is still useful when user re-selects after leaving Explore mid-session — skip auto-apply.
      void recent;
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const patchFilter = useCallback((patch: DiscoveryFilterPatch) => {
    setFilter((prev) => {
      const next = { ...prev, ...patch };
      if (patch.date && !patch.weekAnchorDate) {
        next.weekAnchorDate = patch.date;
      }
      return next;
    });
  }, []);

  const setDate = useCallback((date: string) => {
    setFilter((prev) => ({
      ...prev,
      date,
      weekAnchorDate: date,
    }));
  }, []);

  const setRegion = useCallback((region: JoinDiscoveryRegion) => {
    setFilter((prev) => ({ ...prev, region }));
    void saveRecentDiscoveryRegion(region);
  }, []);

  const shiftWeek = useCallback((deltaWeeks: number) => {
    setFilter((prev) => {
      const nextSunday = shiftWeekAnchor(
        sundayOfWeek(prev.weekAnchorDate),
        deltaWeeks,
      );
      // Keep weekday index when possible
      const prevSunday = sundayOfWeek(prev.date);
      const offsetDays = Math.round(
        (Date.parse(`${prev.date}T12:00:00+09:00`) -
          Date.parse(`${prevSunday}T12:00:00+09:00`)) /
          86_400_000,
      );
      const nextDateParts = nextSunday.split('-').map(Number);
      const shifted = new Date(
        Date.UTC(
          nextDateParts[0]!,
          nextDateParts[1]! - 1,
          nextDateParts[2]! + offsetDays,
          3,
          0,
          0,
        ),
      );
      const y = shifted.getUTCFullYear();
      const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
      const d = String(shifted.getUTCDate()).padStart(2, '0');
      const nextDate = `${y}-${m}-${d}`;
      return {
        ...prev,
        weekAnchorDate: nextDate,
        date: nextDate,
      };
    });
  }, []);

  const resetToTodayNearby = useCallback(() => {
    const base = createDefaultDiscoveryFilter();
    setFilter({
      ...base,
      view: filter.view,
      weekAnchorDate: base.date,
    });
  }, [filter.view]);

  const value = useMemo(
    () => ({
      filter,
      patchFilter,
      setDate,
      setRegion,
      shiftWeek,
      resetToTodayNearby,
    }),
    [filter, patchFilter, setDate, setRegion, shiftWeek, resetToTodayNearby],
  );

  return (
    <JoinDiscoveryContext.Provider value={value}>
      {children}
    </JoinDiscoveryContext.Provider>
  );
}

export function useJoinDiscovery(): JoinDiscoveryContextValue {
  const ctx = useContext(JoinDiscoveryContext);
  if (!ctx) {
    throw new Error('useJoinDiscovery must be used within JoinDiscoveryProvider');
  }
  return ctx;
}

export function useJoinDiscoveryOptional(): JoinDiscoveryContextValue | null {
  return useContext(JoinDiscoveryContext);
}
