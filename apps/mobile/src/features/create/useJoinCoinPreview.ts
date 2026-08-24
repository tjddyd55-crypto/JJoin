import { useEffect, useState } from 'react';
import type { JoinCoinPreviewDto } from '@jjoin/types';
import type { ApiClient } from '@jjoin/api-client';

const PREVIEW_DEBOUNCE_MS = 300;

export function useJoinCoinPreview(
  api: ApiClient,
  plannedPlayerCount: number,
  rewardPerParticipant: string,
  enabled: boolean,
) {
  const [preview, setPreview] = useState<JoinCoinPreviewDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setPreview(null);
      setError(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        setLoading(true);
        setError(null);
        try {
          const next = await api.previewJoinCoin({
            plannedPlayerCount,
            rewardPerParticipant,
          });
          if (!cancelled) setPreview(next);
        } catch (e) {
          if (!cancelled) {
            setPreview(null);
            setError(e instanceof Error ? e.message : 'preview_failed');
            if (__DEV__) {
              console.warn('[join-coin-preview]', e);
            }
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, PREVIEW_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [api, enabled, plannedPlayerCount, rewardPerParticipant]);

  return { preview, loading, error };
}
