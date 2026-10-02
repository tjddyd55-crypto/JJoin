import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  Badge,
  Button,
  Card,
  ScrollScreenFrame,
  Spacer,
  Stack,
  Text,
} from '@jjoin/design-system';
import type { JoinSessionReviewEligibleItemDto, JoinSessionReviewMineItemDto } from '@jjoin/types';
import { formatJoinVenueTypeLabel } from '@jjoin/domain';
import { getApiClient } from '../../src/lib/api';
import { getSecureSessionStore } from '../../src/session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../src/ui/nested-screen';

type TabKey = 'eligible' | 'mine';

function formatDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

function EligibleCard({
  item,
  onWrite,
}: {
  item: JoinSessionReviewEligibleItemDto;
  onWrite: () => void;
}) {
  const label = item.title?.trim() || item.venueName;
  return (
    <Card variant="elevated" padding="md">
      <Stack gap="sm">
        <Text variant="bodyStrong" tone="primary">
          {label}
        </Text>
        <View style={styles.metaRow}>
          <Badge label={formatJoinVenueTypeLabel(item.venueType)} variant="neutral" />
          <Text variant="caption" tone="secondary">
            {formatDay(item.startAt)} · {item.venueName}
          </Text>
        </View>
        <Button label="후기 작성" onPress={onWrite} />
      </Stack>
    </Card>
  );
}

function MineCard({
  item,
  onOpen,
}: {
  item: JoinSessionReviewMineItemDto;
  onOpen: () => void;
}) {
  const joinLabel = item.join.title?.trim() || item.join.venueName;
  return (
    <Pressable onPress={onOpen}>
      <Card variant="elevated" padding="md">
        <Stack gap="sm">
          <Text variant="caption" tone="tertiary">
            {joinLabel} · {formatDay(item.createdAt)}
          </Text>
          <Text variant="bodyStrong" tone="primary">
            {item.title}
          </Text>
          <Text variant="body" tone="secondary" numberOfLines={3}>
            {item.content}
          </Text>
          {item.photos.length > 0 ? (
            <View style={styles.photoRow}>
              {item.photos.map((photo) => (
                <Image key={photo.photoId} source={{ uri: photo.imageUrl }} style={styles.thumb} />
              ))}
            </View>
          ) : null}
          <Text variant="caption" tone="secondary">
            내 후기 보기 · 수정
          </Text>
        </Stack>
      </Card>
    </Pressable>
  );
}

export default function JoinSessionReviewsMenuScreen() {
  const router = useRouter();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [tab, setTab] = useState<TabKey>('eligible');
  const [eligible, setEligible] = useState<JoinSessionReviewEligibleItemDto[]>([]);
  const [mine, setMine] = useState<JoinSessionReviewMineItemDto[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const hub = await api.getMyJoinSessionReviewsHub();
      setEligible(hub.eligible);
      setMine(hub.mine);
    } catch {
      setEligible([]);
      setMine([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <ScrollScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
      <Text variant="screenTitle" tone="primary">
        쪼인 후기
      </Text>
      <Spacer size="md" />
      <View style={styles.tabRow}>
        <Button
          label="작성 가능"
          variant={tab === 'eligible' ? 'primary' : 'secondary'}
          fullWidth={false}
          onPress={() => setTab('eligible')}
        />
        <Button
          label="내가 쓴 후기"
          variant={tab === 'mine' ? 'primary' : 'secondary'}
          fullWidth={false}
          onPress={() => setTab('mine')}
        />
      </View>
      <Spacer size="md" />
      {loading ? (
        <Text tone="secondary">불러오는 중…</Text>
      ) : null}
      {!loading && tab === 'eligible' && eligible.length === 0 ? (
        <Text tone="secondary">
          작성할 쪼인 후기가 없어요.{'\n'}완료된 쪼인에 참여하면 후기를 남길 수 있어요.
        </Text>
      ) : null}
      {!loading && tab === 'mine' && mine.length === 0 ? (
        <Text tone="secondary">아직 작성한 후기가 없어요.</Text>
      ) : null}
      <Stack gap="md">
        {tab === 'eligible'
          ? eligible.map((item) => (
              <EligibleCard
                key={item.joinId}
                item={item}
                onWrite={() => router.push(`/join/${item.joinId}/session-review`)}
              />
            ))
          : mine.map((item) => (
              <MineCard
                key={item.reviewId}
                item={item}
                onOpen={() => router.push(`/join/${item.joinId}/session-review`)}
              />
            ))}
      </Stack>
    </ScrollScreenFrame>
  );
}

const styles = StyleSheet.create({
  tabRow: { flexDirection: 'row', gap: 8 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: { width: 56, height: 56, borderRadius: 8 },
});
