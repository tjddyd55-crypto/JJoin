import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import {
  AppBar,
  EmptyState,
  Spacer,
  Text,
  useTheme,
} from '@jjoin/design-system';
import type { MallCategoryDto, MallProductListItemDto, MallSortOption } from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore } from '../../../session/SessionContext';
import { MallFilterChip } from '../components/MallFilterChip';
import { MallHeaderCoinPill } from '../components/MallHeaderCoinPill';
import { MallProductCard } from '../components/MallProductCard';
import { MallSearchBar } from '../components/MallSearchBar';
import { MallSortTextRow } from '../components/MallSortTextRow';
import { mallColors, mallMetrics } from '../mallDesignTokens';

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
      setItems(res.items.filter((item) => item.purchaseState !== 'paused'));
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

  const header = (
    <View style={styles.headerBlock}>
      <MallSearchBar />
      <Spacer size="sm" />
      <View style={styles.filterRow}>
        <MallFilterChip label="전체" selected={!categoryId} onPress={() => setCategoryId(undefined)} />
        {categories.map((category) => (
          <MallFilterChip
            key={category.id}
            label={category.name}
            selected={categoryId === category.id}
            onPress={() => setCategoryId(category.id)}
          />
        ))}
      </View>
      <MallSortTextRow value={sort} onChange={setSort} />
      <Spacer size="sm" />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.screen}>
        <AppBar
          title="쪼인몰"
          rightActions={<MallHeaderCoinPill availableCoin={availableCoin} />}
        />
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.action.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <AppBar
        title="쪼인몰"
        rightActions={
          <MallHeaderCoinPill
            availableCoin={availableCoin}
            onPress={() => router.push('/mall/orders' as Href)}
          />
        }
      />
      {error ? (
        <View style={styles.errorWrap}>
          {header}
          <EmptyState title="상품을 불러오지 못했습니다" description={error} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void load();
          }}
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
  screen: {
    flex: 1,
    backgroundColor: mallColors.canvas,
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerBlock: { paddingTop: 16 },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: mallMetrics.chipGap,
    paddingHorizontal: mallMetrics.screenPadding,
  },
  gridRow: {
    gap: mallMetrics.gridColumnGap,
    paddingHorizontal: mallMetrics.screenPadding,
  },
  listContent: {
    paddingBottom: 96,
  },
  errorWrap: { paddingBottom: 32 },
});
