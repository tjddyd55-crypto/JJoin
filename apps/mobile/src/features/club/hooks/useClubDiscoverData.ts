import { useCallback, useRef, useState } from 'react';
import type { ClubDiscoverCardDto } from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore } from '../../../session/SessionContext';

export function useClubDiscoverData() {
  const apiRef = useRef(getApiClient(getSecureSessionStore()));
  const [items, setItems] = useState<ClubDiscoverCardDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const load = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    const showSkeleton = mode === 'initial' && !hasLoadedRef.current && items.length === 0;
    if (showSkeleton) setLoading(true);
    if (mode === 'refresh') setRefreshing(true);
    setError(null);
    try {
      const res = await apiRef.current.discoverClubs();
      setItems(res.items);
      hasLoadedRef.current = true;
    } catch {
      setError('동호회 목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [items.length]);

  return {
    items,
    loading,
    refreshing,
    error,
    reload: () => load('refresh'),
    initialLoad: () => load('initial'),
    setItems,
  };
}
