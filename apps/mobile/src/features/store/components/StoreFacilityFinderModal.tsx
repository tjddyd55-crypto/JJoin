import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  Icon,
  Input,
  Row,
  Spacer,
  Text,
  spacing,
  useTheme,
} from '@jjoin/design-system';
import type { GolfFacilityMapDto } from '@jjoin/types';
import {
  buildRegionBreadcrumb,
  listRegionExploreNodes,
  listTopLevelSido,
  regionExploreHasChildren,
} from '@jjoin/domain';
import type { ApiClient } from '@jjoin/api-client';
import {
  formatFacilityRegion,
  listStoreFacilitiesByDistrict,
  StoreFacilitySearchError,
} from '../api/store-facility-search';
import {
  brandLabel,
  facilityTypeLabel,
} from '../../explore/api/golf-facility-explore';

type FinderView =
  | { kind: 'sido' }
  | { kind: 'sigungu'; sido: string; title: string }
  | { kind: 'gu'; sido: string; sigungu: string; title: string }
  | { kind: 'facilities'; sido: string; sigungu: string; title: string };

type Props = {
  visible: boolean;
  api: ApiClient;
  onClose: () => void;
  onSelect: (facility: GolfFacilityMapDto) => void;
};

function facilitySubtitle(facility: GolfFacilityMapDto): string {
  const brand = brandLabel(facility.primaryBrand);
  const typeLabel = facilityTypeLabel(facility.facilityType);
  const category = brand ? `${typeLabel} · ${brand}` : typeLabel;
  const region = formatFacilityRegion(facility);
  return [category, region].filter(Boolean).join(' · ');
}

export function StoreFacilityFinderModal({ visible, api, onClose, onSelect }: Props) {
  const theme = useTheme();
  const [viewStack, setViewStack] = useState<FinderView[]>([{ kind: 'sido' }]);
  const [facilities, setFacilities] = useState<GolfFacilityMapDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const current = viewStack[viewStack.length - 1]!;

  const reset = useCallback(() => {
    setViewStack([{ kind: 'sido' }]);
    setFacilities([]);
    setSearchQuery('');
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!visible) reset();
  }, [visible, reset]);

  const breadcrumbs = useMemo(() => {
    if (current.kind === 'facilities') {
      return buildRegionBreadcrumb(current.sido, current.sigungu);
    }
    return [];
  }, [current]);

  const loadFacilities = useCallback(
    async (sido: string, sigungu: string, q?: string) => {
      setLoading(true);
      setError(null);
      try {
        const items = await listStoreFacilitiesByDistrict(api, {
          sido,
          sigungu,
          q,
          limit: 100,
        });
        setFacilities(items);
        if (items.length === 0) {
          setError(q ? '검색 결과가 없습니다.' : '이 지역에 등록된 스크린골프 매장이 없습니다.');
        }
      } catch (e) {
        setFacilities([]);
        setError(
          e instanceof StoreFacilitySearchError
            ? e.message
            : '매장 목록을 불러오지 못했습니다.',
        );
      } finally {
        setLoading(false);
      }
    },
    [api],
  );

  useEffect(() => {
    if (!visible || current.kind !== 'facilities') return;
    void loadFacilities(current.sido, current.sigungu);
  }, [visible, current, loadFacilities]);

  const popView = () => {
    setViewStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
    setFacilities([]);
    setSearchQuery('');
    setError(null);
  };

  const openFacilities = (sido: string, sigungu: string, title: string) => {
    setViewStack((prev) => [...prev, { kind: 'facilities', sido, sigungu, title }]);
  };

  const onPickSido = (sido: string, label: string) => {
    setViewStack([{ kind: 'sigungu', sido, title: label }]);
  };

  const onPickSigungu = (sido: string, sigungu: string, label: string) => {
    if (regionExploreHasChildren(sido, sigungu)) {
      setViewStack((prev) => [...prev, { kind: 'gu', sido, sigungu, title: label }]);
      return;
    }
    openFacilities(sido, sigungu, label);
  };

  const regionNodes = useMemo(() => {
    if (current.kind === 'sigungu') {
      return listRegionExploreNodes(current.sido);
    }
    if (current.kind === 'gu') {
      return listRegionExploreNodes(current.sido, current.sigungu);
    }
    return [];
  }, [current]);

  const headerTitle =
    current.kind === 'sido'
      ? '매장 찾기'
      : current.kind === 'facilities'
        ? current.title
        : current.title;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView
        style={[styles.root, { backgroundColor: theme.colors.app.background }]}
        edges={['top', 'bottom']}
      >
        <Row align="center" justify="space-between" style={styles.header}>
          <Row align="center" gap="sm">
            {viewStack.length > 1 ? (
              <Pressable onPress={popView} hitSlop={8} accessibilityRole="button">
                <Text variant="meta" tone="secondary">
                  {'\u2039'}
                </Text>
              </Pressable>
            ) : null}
            <Text variant="sectionTitle" tone="primary">
              {headerTitle}
            </Text>
          </Row>
          <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="닫기">
            <Icon name="close" size="md" tone="secondary" />
          </Pressable>
        </Row>

        {breadcrumbs.length > 0 ? (
          <Text variant="caption" tone="tertiary" style={styles.breadcrumb}>
            {breadcrumbs.map((b) => b.label).join(' > ')}
          </Text>
        ) : null}

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {current.kind === 'sido' ? (
            listTopLevelSido().map((item) => (
              <Pressable
                key={item.sido}
                onPress={() => onPickSido(item.sido, item.label)}
                style={({ pressed }) => [
                  styles.row,
                  { borderBottomColor: theme.colors.border.subtle },
                  pressed ? { backgroundColor: theme.colors.surface.elevated } : null,
                ]}
              >
                <Text variant="body" tone="primary">
                  {item.label}
                </Text>
                <Text variant="meta" tone="tertiary">
                  {'\u203A'}
                </Text>
              </Pressable>
            ))
          ) : null}

          {current.kind === 'sigungu' || current.kind === 'gu'
            ? regionNodes.map((node) => (
                <Pressable
                  key={`${node.sido}|${node.sigungu}`}
                  onPress={() =>
                    current.kind === 'gu'
                      ? openFacilities(node.sido, node.sigungu, node.label)
                      : onPickSigungu(node.sido, node.sigungu, node.label)
                  }
                  style={({ pressed }) => [
                    styles.row,
                    { borderBottomColor: theme.colors.border.subtle },
                    pressed ? { backgroundColor: theme.colors.surface.elevated } : null,
                  ]}
                >
                  <Text variant="body" tone="primary">
                    {node.label}
                  </Text>
                  <Text variant="meta" tone="tertiary">
                    {'\u203A'}
                  </Text>
                </Pressable>
              ))
            : null}

          {current.kind === 'facilities' ? (
            <>
              <Text variant="meta" tone="secondary">
                스크린 {facilities.length > 0 ? `${facilities.length}곳` : ''}
              </Text>
              <Spacer size="sm" />
              <Input
                label="매장명 검색"
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="골프존, SG, 백석, 장항…"
                returnKeyType="search"
                onSubmitEditing={() =>
                  void loadFacilities(current.sido, current.sigungu, searchQuery)
                }
              />
              <Spacer size="xs" />
              <Button
                label="검색"
                variant="secondary"
                onPress={() =>
                  void loadFacilities(current.sido, current.sigungu, searchQuery)
                }
                loading={loading}
              />
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={theme.colors.action.primary} />
                  <Text variant="caption" tone="secondary">
                    매장 불러오는 중…
                  </Text>
                </View>
              ) : null}
              {error ? (
                <Text variant="caption" tone="secondary" style={styles.feedback}>
                  {error}
                </Text>
              ) : null}
              {facilities.map((facility) => (
                <Pressable
                  key={facility.id}
                  onPress={() => {
                    onSelect(facility);
                    onClose();
                  }}
                  style={({ pressed }) => [
                    styles.facilityRow,
                    { borderBottomColor: theme.colors.border.subtle },
                    pressed ? { backgroundColor: theme.colors.surface.elevated } : null,
                  ]}
                >
                  <Text variant="bodyStrong" tone="primary">
                    {facility.displayName}
                  </Text>
                  {facility.roadAddress ? (
                    <Text variant="caption" tone="secondary">
                      {facility.roadAddress}
                    </Text>
                  ) : null}
                  <Text variant="caption" tone="tertiary">
                    {facilitySubtitle(facility)}
                  </Text>
                </Pressable>
              ))}
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  breadcrumb: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  facilityRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  feedback: {
    marginTop: spacing.sm,
  },
});
