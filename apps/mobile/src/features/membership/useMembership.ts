import { useCallback, useEffect, useMemo, useState } from 'react';
import type { UserMembershipDto } from '@jjoin/types';
import { getApiClient } from '../../lib/api';
import { getSecureSessionStore, useSession } from '../../session/SessionContext';
import {
  mapUserMembershipDto,
  presentMembership,
  type MembershipPresentation,
  type MobileMembership,
} from './membership-presentation';

export type MembershipLoadState = 'bootstrapping' | 'loading' | 'ready' | 'error';

export type UseMembershipResult = {
  state: MembershipLoadState;
  membership: MobileMembership | null;
  presentation: MembershipPresentation | null;
  error: string | null;
  refresh: () => Promise<void>;
};

/**
 * Central membership access — Session MeDto.membership SSOT.
 * Does not invent FREE while bootstrapping/loading.
 */
export function useMembership(): UseMembershipResult {
  const { me, bootstrapping, refreshMe } = useSession();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [fallback, setFallback] = useState<UserMembershipDto | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);

  const loadFallback = useCallback(async () => {
    if (!me?.userId) return;
    setFetching(true);
    setFetchError(null);
    try {
      const dto = await api.getMyMembership();
      setFallback(dto);
    } catch (e) {
      setFallback(null);
      setFetchError(e instanceof Error ? e.message : 'membership_fetch_failed');
    } finally {
      setFetching(false);
    }
  }, [api, me?.userId]);

  useEffect(() => {
    if (bootstrapping || !me) {
      setFallback(null);
      setFetchError(null);
      return;
    }
    if (me.membership) {
      setFallback(null);
      setFetchError(null);
      return;
    }
    void loadFallback();
  }, [bootstrapping, me, loadFallback]);

  const refresh = useCallback(async () => {
    await refreshMe();
    // After refreshMe, effect re-runs; also force membership endpoint if still missing.
    try {
      const dto = await api.getMyMembership();
      setFallback(dto);
      setFetchError(null);
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : 'membership_fetch_failed');
    }
  }, [api, refreshMe]);

  return useMemo(() => {
    if (bootstrapping) {
      return {
        state: 'bootstrapping' as const,
        membership: null,
        presentation: null,
        error: null,
        refresh,
      };
    }
    if (!me) {
      return {
        state: 'ready' as const,
        membership: null,
        presentation: null,
        error: null,
        refresh,
      };
    }

    const dto = me.membership ?? fallback;
    if (!dto) {
      if (fetchError) {
        return {
          state: 'error' as const,
          membership: null,
          presentation: null,
          error: fetchError,
          refresh,
        };
      }
      return {
        state: fetching || !me.membership ? ('loading' as const) : ('error' as const),
        membership: null,
        presentation: null,
        error: null,
        refresh,
      };
    }

    const membership = mapUserMembershipDto(dto);
    return {
      state: 'ready' as const,
      membership,
      presentation: presentMembership(membership),
      error: null,
      refresh,
    };
  }, [bootstrapping, me, fallback, fetching, fetchError, refresh]);
}
