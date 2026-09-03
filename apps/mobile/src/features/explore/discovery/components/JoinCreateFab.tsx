import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Icon, spacing, useTheme } from '@jjoin/design-system';
import { useJoinCoinPreview } from '../../../create/useJoinCoinPreview';
import { getApiClient } from '../../../../lib/api';
import { getSecureSessionStore, useSession } from '../../../../session/SessionContext';
import { shouldShowJoinCreateFab } from '../model/join-create-fab-visibility';

const FAB_SIZE = 56;
const DEFAULT_PLAYERS = 4;
const DEFAULT_REWARD = '0';

/** 조인 탭 탐색 화면 공통 — create route 재사용 */
export function JoinCreateFab() {
  const router = useRouter();
  const theme = useTheme();
  const { me } = useSession();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const { preview } = useJoinCoinPreview(
    api,
    DEFAULT_PLAYERS,
    DEFAULT_REWARD,
    Boolean(me?.userId),
  );
  const showFab = shouldShowJoinCreateFab(preview?.creatorUserType);

  // Tab screen content is laid out above BottomNavigation (see app/(tabs)/_layout).
  // `bottom` is relative to the content area — do not add tab bar height again.
  const bottom = spacing.sm;

  if (!showFab) return null;

  return (
    <View pointerEvents="box-none" style={[styles.host, { bottom }]}>
      <Pressable
        onPress={() => router.push('/(tabs)/create')}
        accessibilityRole="button"
        accessibilityLabel="조인 만들기"
        style={[
          styles.fab,
          {
            backgroundColor: theme.colors.action.primary,
            shadowColor: '#000',
          },
        ]}
      >
        <Icon name="plus" size="md" tone="inverse" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    right: spacing.md + 4,
    zIndex: 20,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
  },
});
