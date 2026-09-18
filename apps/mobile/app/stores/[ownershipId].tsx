import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Button, ScrollScreenFrame, Text, spacing } from '@jjoin/design-system';
import { formatStoreAmenityLabel, formatStoreScreenBrandLabel } from '@jjoin/domain';
import type { PublicStoreDetailDto } from '@jjoin/types';
import { getApiClient } from '../../src/lib/api';
import { getSecureSessionStore } from '../../src/session/SessionContext';
import { saveJoinCreateDraft } from '../../src/features/join-create/model/join-create-draft';

export default function ScreenStoreDetailScreen() {
  const { ownershipId } = useLocalSearchParams<{ ownershipId: string }>();
  const router = useRouter();
  const [store, setStore] = useState<PublicStoreDetailDto | null>(null);

  useEffect(() => {
    if (!ownershipId) return;
    void getApiClient(getSecureSessionStore())
      .getScreenStore(ownershipId)
      .then(setStore)
      .catch(() => setStore(null));
  }, [ownershipId]);

  if (!store) {
    return (
      <ScrollScreenFrame>
        <Stack.Screen options={{ title: '매장' }} />
        <Text>매장 정보를 불러오는 중이거나 비공개입니다.</Text>
      </ScrollScreenFrame>
    );
  }

  return (
    <ScrollScreenFrame>
      <Stack.Screen options={{ title: store.name }} />
      <View style={styles.section}>
        <Text variant="screenTitle">{store.name}</Text>
        <Text tone="secondary">{store.regionLabel}</Text>
        <Text>
          {formatStoreScreenBrandLabel(store.screenBrand, store.screenBrandOther)}
        </Text>
        {store.vibe ? <Text>분위기 · {store.vibe}</Text> : null}
        {store.intro ? <Text>{store.intro}</Text> : null}
        {store.amenities.length > 0 ? (
          <Text>{store.amenities.map(formatStoreAmenityLabel).join(' · ')}</Text>
        ) : null}
        {store.photos.length > 0 ? (
          <Text tone="secondary">사진 {store.photos.length}장</Text>
        ) : null}
        <Button
          label="이 매장에서 조인 만들기"
          onPress={() => {
            if (store.venue.venueId) {
              saveJoinCreateDraft({
                players: 4,
                selectedVenue: {
                  venueId: store.venue.venueId,
                  name: store.venue.name,
                  address: store.venue.address ?? '',
                  source: 'VENUE',
                },
              });
            }
            router.push({
              pathname: '/(tabs)/create',
              params: {
                venueId: store.venue.venueId ?? '',
                venueName: store.venue.name,
                venueAddress: store.venue.address ?? '',
              },
            });
          }}
        />
      </View>
    </ScrollScreenFrame>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
});
