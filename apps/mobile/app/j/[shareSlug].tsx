import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, ScrollScreenFrame } from '@jjoin/design-system';
import { getApiClient } from '../../src/lib/api';
import { getSecureSessionStore } from '../../src/session/SessionContext';

/** Deep link target: jjoin://j/{shareSlug} — resolves to join detail without public UUID leak. */
export default function ShareSlugDeepLinkScreen() {
  const { shareSlug } = useLocalSearchParams<{ shareSlug: string }>();
  const router = useRouter();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const slug = typeof shareSlug === 'string' ? shareSlug.trim() : '';
    if (!slug) {
      setError('잘못된 공유 링크입니다.');
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const resolved = await api.resolveJoinShareSlug(slug);
        if (cancelled) return;
        router.replace(`/join/${resolved.joinId}`);
      } catch {
        if (!cancelled) setError('공유 조인을 열 수 없습니다.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shareSlug, router, api]);

  return (
    <ScrollScreenFrame>
      <Text tone="secondary">{error ?? '조인으로 이동 중…'}</Text>
    </ScrollScreenFrame>
  );
}
