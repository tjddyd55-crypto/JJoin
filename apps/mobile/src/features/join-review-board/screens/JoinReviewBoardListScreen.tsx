import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { Button, Text, spacing, useTheme } from '@jjoin/design-system';
import type { JoinReviewPostListItemDto } from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore } from '../../../session/SessionContext';
import { ScrollScreenFrame } from '@jjoin/design-system';
import { formatJoinReviewBoardDate } from '../format-review-date';

function ReviewListRow({ item, onPress }: { item: JoinReviewPostListItemDto; onPress: () => void }) {
  const theme = useTheme();
  const hasThumb = Boolean(item.thumbnailUrl);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          borderBottomColor: theme.colors.border.subtle,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <View style={[styles.copy, hasThumb ? styles.copyWithThumb : null]}>
        <Text variant="bodyStrong" tone="primary" numberOfLines={1}>
          {item.title}
        </Text>
        <Text variant="body" tone="secondary" numberOfLines={2}>
          {item.contentPreview}
        </Text>
        <Text variant="caption" tone="tertiary">
          {item.author.nickname} · {formatJoinReviewBoardDate(item.createdAt)}
        </Text>
      </View>
      {hasThumb ? (
        <Image source={{ uri: item.thumbnailUrl! }} style={styles.thumb} accessibilityIgnoresInvertColors />
      ) : null}
    </Pressable>
  );
}

export function JoinReviewBoardListScreen() {
  const router = useRouter();
  const theme = useTheme();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [items, setItems] = useState<JoinReviewPostListItemDto[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.listJoinReviewPosts();
      setItems(res.items);
      setCursor(res.nextCursor);
      setError(null);
    } catch {
      setError('후기 목록을 불러오지 못했습니다.');
      setItems([]);
      setCursor(null);
    } finally {
      setLoading(false);
    }
  }, [api]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await api.listJoinReviewPosts();
      setItems(res.items);
      setCursor(res.nextCursor);
      setError(null);
    } catch {
      setError('후기 목록을 불러오지 못했습니다.');
    } finally {
      setRefreshing(false);
    }
  }, [api]);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await api.listJoinReviewPosts({ cursor });
      setItems((prev) => [...prev, ...res.items]);
      setCursor(res.nextCursor);
    } catch {
      setError('더 불러오지 못했습니다.');
    } finally {
      setLoadingMore(false);
    }
  }, [api, cursor, loadingMore]);

  useFocusEffect(
    useCallback(() => {
      void loadInitial();
    }, [loadInitial]),
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.app.background }]}>
      <View style={styles.header}>
        <Text variant="screenTitle" tone="primary">쪼인 후기</Text>
        <Button
          label="글쓰기"
          fullWidth={false}
          onPress={() => router.push('/reviews/new' as Href)}
        />
      </View>
      {error ? (
        <View style={styles.errorBox}>
          <Text tone="secondary">{error}</Text>
          <Button label="다시 시도" variant="secondary" fullWidth={false} onPress={() => void loadInitial()} />
        </View>
      ) : null}
      {loading && items.length === 0 ? (
        <ActivityIndicator style={styles.loader} color={theme.colors.action.primary} />
      ) : null}
      {!loading && items.length === 0 && !error ? (
        <ScrollScreenFrame>
          <Text tone="secondary">아직 등록된 후기가 없습니다. 첫 후기를 남겨 보세요.</Text>
        </ScrollScreenFrame>
      ) : null}
      <FlatList
        data={items}
        keyExtractor={(item) => item.reviewId}
        renderItem={({ item }) => (
          <ReviewListRow
            item={item}
            onPress={() => router.push(`/reviews/${item.reviewId}` as Href)}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />
        }
        onEndReached={() => {
          void loadMore();
        }}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          loadingMore ? <ActivityIndicator style={styles.footerLoader} color={theme.colors.action.primary} /> : null
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  listContent: { paddingBottom: spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  copy: { flex: 1, gap: 6, minWidth: 0 },
  copyWithThumb: { paddingRight: spacing.xs },
  thumb: { width: 72, height: 72, borderRadius: 10 },
  loader: { marginTop: spacing.xl },
  footerLoader: { marginVertical: spacing.md },
  errorBox: { padding: spacing.md, gap: spacing.sm },
});
