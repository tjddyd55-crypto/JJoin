import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollScreenFrame, Spacer } from '@jjoin/design-system';
import type { PublicStoreDetailDto } from '@jjoin/types';
import { getApiClient } from '../../src/lib/api';
import { getSecureSessionStore } from '../../src/session/SessionContext';
import { saveJoinCreateDraft } from '../../src/features/join-create/model/join-create-draft';
import { StorePhotoCarousel } from '../../src/features/store-profile/components/StorePhotoCarousel';
import {
  StoreJoinCta,
  StoreProfileBody,
  StoreProfileHeader,
} from '../../src/features/store-profile/components/StoreProfileSections';

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
      </ScrollScreenFrame>
    );
  }

  return (
    <ScrollScreenFrame>
      <Stack.Screen options={{ title: store.name }} />
      <StorePhotoCarousel coverImageUrl={store.coverImageUrl} photos={store.photos} />
      <Spacer size="md" />
      <StoreProfileHeader store={{ ...store, address: store.venue.address ?? store.address }} />
      <Spacer size="md" />
      <StoreProfileBody store={store} />
      <Spacer size="md" />
      <StoreJoinCta
        store={store}
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
    </ScrollScreenFrame>
  );
}

const styles = StyleSheet.create({});
