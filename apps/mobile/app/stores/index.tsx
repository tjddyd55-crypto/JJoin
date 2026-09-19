import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ScrollScreenFrame, Text, spacing, useTheme } from '@jjoin/design-system';
import type { PublicStoreListItemDto } from '@jjoin/types';
import { getApiClient } from '../../src/lib/api';
import { getSecureSessionStore } from '../../src/session/SessionContext';

export default function ScreenStoresListScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [items, setItems] = useState<PublicStoreListItemDto[]>([]);
  const [sido, setSido] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const api = getApiClient(getSecureSessionStore());
      setItems(await api.listScreenStores({ sido }));
      setError(null);
    } catch {
      setError('매장 목록을 불러오지 못했습니다.');
    }
  }, [sido]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScrollScreenFrame>
      <Stack.Screen options={{ title: '스크린 매장' }} />
      <View style={styles.filters}>
        {[
          { label: '전체', value: undefined },
          { label: '서울', value: '서울특별시' },
          { label: '경기', value: '경기도' },
        ].map((chip) => (
          <Pressable
            key={chip.label}
            onPress={() => setSido(chip.value)}
            style={[
              styles.chip,
              {
                backgroundColor:
                  sido === chip.value ? theme.colors.action.primary : theme.colors.surface.elevated,
              },
            ]}
          >
            <Text tone={sido === chip.value ? 'inverse' : 'primary'}>{chip.label}</Text>
          </Pressable>
        ))}
      </View>
      {error ? <Text tone="error">{error}</Text> : null}
      {items.length === 0 ? (
        <Text tone="secondary">공개된 스크린 매장이 아직 없습니다.</Text>
      ) : (
        items.map((item) => (
          <Pressable
            key={item.ownershipId}
            onPress={() => router.push(`/stores/${item.ownershipId}`)}
            style={[styles.card, { backgroundColor: theme.colors.surface.elevated }]}
          >
            <View style={styles.cardRow}>
              {item.coverImageUrl ? (
                <Image source={{ uri: item.coverImageUrl }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, { backgroundColor: theme.colors.surface.base }]} />
              )}
              <View style={styles.cardBody}>
                <Text variant="sectionTitle">{item.name}</Text>
                <Text tone="secondary">
                  {[item.regionLabel, item.screenBrandLabel].filter(Boolean).join(' · ')}
                </Text>
                {item.minPriceLabel ? <Text>{item.minPriceLabel}</Text> : null}
                {item.reservationAvailable ? (
                  <Text tone="secondary">예약 가능</Text>
                ) : null}
              </View>
            </View>
          </Pressable>
        ))
      )}
    </ScrollScreenFrame>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  chip: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  card: { borderRadius: 12, padding: spacing.md, marginBottom: spacing.sm },
  cardRow: { flexDirection: 'row', gap: spacing.sm },
  thumb: { width: 72, height: 72, borderRadius: 8 },
  cardBody: { flex: 1, gap: 4 },
});
