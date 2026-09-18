import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Button, Card, Input, ScrollScreenFrame, Spacer, Text } from '@jjoin/design-system';
import type { StoreBannerAdRequestDto } from '@jjoin/types';
import { getApiClient } from '../../src/lib/api';
import { getSecureSessionStore } from '../../src/session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../src/ui/nested-screen';

export default function StoreBannerAdsScreen() {
  const { ownershipId } = useLocalSearchParams<{ ownershipId?: string }>();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [items, setItems] = useState<StoreBannerAdRequestDto[]>([]);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await api.listMyStoreBannerAds());
      setError(null);
    } catch {
      setError('광고 요청을 불러오지 못했습니다.');
    }
  }, [api]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function submit() {
    if (!ownershipId) {
      setError('매장을 선택해주세요.');
      return;
    }
    setBusy(true);
    try {
      await api.createStoreBannerAd({
        ownershipId,
        title: title.trim(),
        subtitle: subtitle.trim() || null,
      });
      setTitle('');
      setSubtitle('');
      await load();
    } catch {
      setError('광고 요청에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
      <Text variant="body" tone="secondary">
        홈 배너 광고를 요청하면 관리자가 승인·일정 등록 후 노출됩니다.
      </Text>
      <Spacer size="md" />
      <Input label="제목" value={title} onChangeText={setTitle} />
      <Spacer size="sm" />
      <Input label="부제 (선택)" value={subtitle} onChangeText={setSubtitle} />
      <Spacer size="sm" />
      <Button label="광고 요청" loading={busy} onPress={() => void submit()} />
      {error ? <Text tone="error">{error}</Text> : null}
      <Spacer size="lg" />
      {items.map((item) => (
        <Card key={item.id} variant="base" padding="md">
          <Text variant="bodyStrong">{item.title}</Text>
          <Text tone="secondary">
            {item.storeName} · {item.status}
          </Text>
        </Card>
      ))}
    </ScrollScreenFrame>
  );
}
