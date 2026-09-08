import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import {
  AppBar,
  Chip,
  EmptyState,
  ScrollScreenFrame,
  Spacer,
  Text,
  spacing,
  useTheme,
} from '@jjoin/design-system';
import type { MallCategoryDto, MallProductListItemDto, MallSortOption } from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore } from '../../../session/SessionContext';
import { MallCoinBalanceCard } from '../components/MallCoinBalanceCard';
import { MallHeroBanner } from '../components/MallHeroBanner';
import { MallProductCard } from '../components/MallProductCard';

const SORT_OPTIONS: Array<{ key: MallSortOption; label: string }> = [
  { key: 'recommended', label: '추천순' },
  { key: 'latest', label: '최신순' },
  { key: 'coin_asc', label: '낮은 코인순' },
];

export function JoinMallHomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<MallCategoryDto[]>([]);
  const [items, setItems] = useState<MallProductListItemDto[]>([]);
  const [availableCoin, setAvailableCoin] = useState('0');
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [sort, setSort] = useState<MallSortOption>('recommended');

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await api.listMallProducts({ categoryId, sort });
      setCategories(res.categories);
      setItems(res.items);
      setAvailableCoin(res.availableCoin);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'load_failed');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [api, categoryId, sort]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    void load();
  };

  const header = (
    <View style={styles.headerBlock}>
      <MallHeroBanner />
      <Spacer size="md" />
      <MallCoinBalanceCard
        availableCoin={availableCoin}
        onPressOrders={() => router.push('/mall/orders' as Href)}
      />
      <Spacer size="md" />
      <View style={styles.filterRow}>
        <Chip
          label="전체"
          selected={!categoryId}
          onPress={() => setCategoryId(undefined)}
        />
        {categories.map((category) => (
          <Chip
            key={category.id}
            label={category.name}
            selected={categoryId === category.id}
            onPress={() => setCategoryId(category.id)}
          />
        ))}
      </View>
      <View style={styles.sortRow}>
        {SORT_OPTIONS.map((option) => (
          <Pressable
            key={option.key}
            accessibilityRole="button"
            onPress={() => setSort(option.key)}
            style={[
              styles.sortPill,
              {
                backgroundColor:
                  sort === option.key ? theme.colors.state.selectedSurface : theme.colors.surface.elevated,
                borderColor:
                  sort === option.key ? theme.colors.state.selectedBorder : theme.colors.border.subtle,
              },
            ]}
          >
            <Text
              variant="caption"
              tone={sort === option.key ? 'primary' : 'secondary'}
              style={sort === option.key ? { color: theme.colors.state.selectedText } : undefined}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <Spacer size="sm" />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <AppBar title="쪼인몰" />
        <ActivityIndicator color={theme.colors.action.primary} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <AppBar title="쪼인몰" />
      {error ? (
        <ScrollScreenFrame contentContainerStyle={styles.errorWrap}>
          {header}
          <EmptyState title="상품을 불러오지 못했습니다" description={error} />
        </ScrollScreenFrame>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <EmptyState
              title="등록된 상품이 없습니다"
              description="곧 새로운 리워드 상품이 준비됩니다"
            />
          }
          renderItem={({ item }) => (
            <MallProductCard
              product={item}
              onPress={() => router.push(`/mall/${item.id}` as Href)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center' },
  headerBlock: { gap: 0 },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  sortRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  sortPill: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  gridRow: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  listContent: {
    paddingBottom: spacing.xl + 72,
    gap: spacing.sm,
  },
  errorWrap: { paddingBottom: spacing.xl },
});
