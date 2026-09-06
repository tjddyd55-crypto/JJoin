import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Button,
  ProfileAvatar,
  ScrollScreenFrame,
  Text,
  useTheme,
} from '@jjoin/design-system';
import { GolfFriendRelationship, type GolfFriendCardDto } from '@jjoin/types';
import * as Location from 'expo-location';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore } from '../../../session/SessionContext';

type TabId = 'recommended' | 'popular' | 'nearby' | 'search';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'recommended', label: '오늘의 추천' },
  { id: 'popular', label: '인기회원' },
  { id: 'nearby', label: '근처회원' },
  { id: 'search', label: '회원검색' },
];

type FriendAction = 'request' | 'accept' | 'reject' | 'cancel' | 'unfriend';

function GolfFriendCardItem({
  item,
  onPressProfile,
  onAction,
  acting,
}: {
  item: GolfFriendCardDto;
  onPressProfile: () => void;
  onAction: (action: FriendAction) => void;
  acting: boolean;
}) {
  const theme = useTheme();
  const sport = item.user.sportProfiles[0];

  const renderActions = () => {
    switch (item.relationship) {
      case GolfFriendRelationship.FRIENDS:
        return (
          <Button
            label="친구"
            size="sm"
            variant="secondary"
            disabled={acting}
            onPress={() => onAction('unfriend')}
          />
        );
      case GolfFriendRelationship.REQUESTED:
        return (
          <Button
            label="요청 취소"
            size="sm"
            variant="secondary"
            disabled={acting}
            loading={acting}
            onPress={() => onAction('cancel')}
          />
        );
      case GolfFriendRelationship.RECEIVED:
        return (
          <View style={styles.dualActions}>
            <Button
              label="수락"
              size="sm"
              variant="primary"
              disabled={acting}
              loading={acting}
              onPress={() => onAction('accept')}
            />
            <Button
              label="거절"
              size="sm"
              variant="secondary"
              disabled={acting}
              onPress={() => onAction('reject')}
            />
          </View>
        );
      default:
        return (
          <Button
            label="친구요청"
            size="sm"
            variant="primary"
            disabled={acting}
            loading={acting}
            onPress={() => onAction('request')}
          />
        );
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPressProfile}
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface.card,
          borderColor: theme.colors.border.subtle,
        },
      ]}
    >
      <ProfileAvatar
        imageUrl={item.user.avatarUrl}
        name={item.user.nickname}
        size="md"
      />
      <View style={styles.cardBody}>
        <Text variant="bodyStrong" tone="primary" numberOfLines={1}>
          {item.user.nickname}
        </Text>
        {item.user.regionLabel ? (
          <Text variant="caption" tone="secondary" numberOfLines={1}>
            {item.user.regionLabel}
            {item.approxDistanceMeters != null
              ? ` · 약 ${Math.round(item.approxDistanceMeters / 100) / 10}km`
              : ''}
          </Text>
        ) : null}
        {sport ? (
          <Text variant="caption" tone="tertiary" numberOfLines={1}>
            {sport.sportCode} · {sport.skillLevel}
          </Text>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={(e) => {
          e.stopPropagation?.();
        }}
        style={styles.requestHit}
      >
        {renderActions()}
      </Pressable>
    </Pressable>
  );
}

export function GolfFriendsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [tab, setTab] = useState<TabId>('recommended');
  const [items, setItems] = useState<GolfFriendCardDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let res;
      if (tab === 'recommended') res = await api.getGolfFriendsRecommended();
      else if (tab === 'popular') res = await api.getGolfFriendsPopular();
      else if (tab === 'nearby') {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (!perm.granted) {
          setItems([]);
          setError('근처 회원을 보려면 위치 권한이 필요합니다.');
          return;
        }
        const loc = await Location.getCurrentPositionAsync({});
        res = await api.getGolfFriendsNearby(loc.coords.latitude, loc.coords.longitude);
      } else {
        if (searchQuery.trim().length < 2) {
          setItems([]);
          return;
        }
        res = await api.searchGolfFriends(searchQuery.trim());
      }
      setItems(res.items);
    } catch {
      setError('목록을 불러오지 못했습니다.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [api, searchQuery, tab]);

  useEffect(() => {
    if (tab === 'search' && searchQuery.trim().length < 2) {
      setItems([]);
      return;
    }
    void load();
  }, [load, tab]);

  const patchRelationship = (userId: string, relationship: GolfFriendRelationship) => {
    setItems((prev) =>
      prev.map((item) =>
        item.user.id === userId ? { ...item, relationship } : item,
      ),
    );
  };

  const onAction = async (userId: string, action: FriendAction) => {
    setActingId(userId);
    setError(null);
    try {
      let result: { relationship: GolfFriendRelationship };
      if (action === 'request') result = await api.requestGolfFriend(userId);
      else if (action === 'accept') result = await api.acceptGolfFriend(userId);
      else if (action === 'reject') result = await api.rejectGolfFriend(userId);
      else if (action === 'cancel') result = await api.cancelGolfFriendRequest(userId);
      else result = await api.unfriendGolfFriend(userId);
      patchRelationship(userId, result.relationship);
    } catch {
      setError('요청을 처리하지 못했습니다.');
    } finally {
      setActingId(null);
    }
  };

  const emptyMessage =
    tab === 'search'
      ? '검색어를 입력하세요.'
      : tab === 'nearby'
        ? '근처에 표시할 회원이 없어요'
        : '표시할 회원이 없습니다.';

  return (
    <ScrollScreenFrame>
      <Text variant="screenTitle" tone="primary">골프친구</Text>
      <Text variant="meta" tone="secondary" style={styles.subtitle}>
        함께 라운드할 골퍼를 찾아보세요.
      </Text>

      <View style={styles.tabs}>
        {TABS.map((t) => (
          <Pressable
            key={t.id}
            accessibilityRole="button"
            onPress={() => setTab(t.id)}
            style={[
              styles.tab,
              tab === t.id && { backgroundColor: theme.colors.state.selectedSurface },
            ]}
          >
            <Text
              variant="joinTabLabel"
              tone={tab === t.id ? 'primary' : 'secondary'}
              style={tab === t.id ? styles.tabActive : undefined}
            >
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {tab === 'search' ? (
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="닉네임 검색 (2자 이상)"
          placeholderTextColor={theme.colors.text.tertiary}
          style={[
            styles.searchInput,
            {
              borderColor: theme.colors.border.subtle,
              color: theme.colors.text.primary,
            },
          ]}
          onSubmitEditing={() => void load()}
          returnKeyType="search"
        />
      ) : null}

      {loading ? <ActivityIndicator style={styles.loader} /> : null}
      {error ? <Text variant="body" tone="error">{error}</Text> : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.user.id}
        scrollEnabled={false}
        numColumns={1}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loading ? (
            <Text variant="meta" tone="tertiary" style={styles.empty}>
              {emptyMessage}
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <GolfFriendCardItem
            item={item}
            onPressProfile={() => router.push(`/user/${item.user.id}`)}
            onAction={(action) => void onAction(item.user.id, action)}
            acting={actingId === item.user.id}
          />
        )}
      />
    </ScrollScreenFrame>
  );
}

const styles = StyleSheet.create({
  subtitle: { marginTop: 4, marginBottom: 12 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    minHeight: 44,
    justifyContent: 'center',
  },
  tabActive: { fontWeight: '700' },
  searchInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    minHeight: 44,
  },
  loader: { marginVertical: 16 },
  list: { gap: 10 },
  empty: { textAlign: 'center', paddingVertical: 24 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 72,
  },
  cardBody: { flex: 1, gap: 2, minWidth: 0 },
  requestHit: { flexShrink: 0 },
  dualActions: { flexDirection: 'row', gap: 6 },
});
