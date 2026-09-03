import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import {
  Button,
  Card,
  Text,
  spacing,
  useTheme,
} from '@jjoin/design-system';
import type { IconName } from '@jjoin/design-system';
import type { ApiClient } from '@jjoin/api-client';
import type { GolfFacilityMapDto, UserVenuePickerItemDto } from '@jjoin/types';
import { facilityTypeLabel } from '../../explore/api/golf-facility-explore';
import {
  type JoinCreateVenueSelection,
  venueSelectionFromVenueDto,
  venueSelectionHasPlace,
} from '../model/join-create-venue';

type Props = {
  api: ApiClient;
  selected: JoinCreateVenueSelection | null;
  onChange: (next: JoinCreateVenueSelection | null) => void;
  onPickFromMap: () => void;
  /** SCREEN club events: GolfFacility pick only (no free-text custom). */
  restrictToFacilityPick?: boolean;
};

type PickerAction = 'map' | 'search' | 'custom' | null;

const PLACE_ACTIONS: Array<{ action: PickerAction; label: string; icon: IconName }> = [
  { action: 'map', label: '지도에서 찾기', icon: 'location' },
  { action: 'search', label: '주소로 검색', icon: 'search' },
  { action: 'custom', label: '직접 입력', icon: 'edit' },
];

export function JoinCreateVenueSection({
  api,
  selected,
  onChange,
  onPickFromMap,
  restrictToFacilityPick = false,
}: Props) {
  const theme = useTheme();
  const [recent, setRecent] = useState<UserVenuePickerItemDto[]>([]);
  const [favorites, setFavorites] = useState<UserVenuePickerItemDto[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [changeOpen, setChangeOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHits, setSearchHits] = useState<GolfFacilityMapDto[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customAddress, setCustomAddress] = useState('');
  const [customPhone, setCustomPhone] = useState('');
  const [customSaving, setCustomSaving] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const themed = useMemo(
    () => ({
      listRowBorder: { borderBottomColor: theme.colors.border.subtle },
      emptyState: { backgroundColor: theme.colors.surface.card },
      sheet: {
        backgroundColor: theme.colors.surface.elevated,
        borderTopLeftRadius: theme.radius.lg,
        borderTopRightRadius: theme.radius.lg,
      },
      modal: { backgroundColor: theme.colors.app.background },
      input: {
        borderColor: theme.colors.border.subtle,
        borderRadius: theme.radius.sm,
        color: theme.colors.text.primary,
        backgroundColor: theme.colors.surface.card,
      },
      hitRowBorder: { borderBottomColor: theme.colors.border.subtle },
    }),
    [theme],
  );

  const loadLists = useCallback(async () => {
    setLoadingLists(true);
    try {
      const [r, f] = await Promise.all([
        api.getMyRecentVenues().catch(() => ({ items: [] })),
        api.getMyFavoriteVenues().catch(() => ({ items: [] })),
      ]);
      setRecent(r.items);
      setFavorites(f.items);
    } finally {
      setLoadingLists(false);
    }
  }, [api]);

  useEffect(() => {
    void loadLists();
  }, [loadLists]);

  const selectPickerItem = useCallback(
    (item: UserVenuePickerItemDto) => {
      onChange(venueSelectionFromVenueDto(item));
      setChangeOpen(false);
      setSearchOpen(false);
      setActionError(null);
    },
    [onChange],
  );

  const activateFacility = useCallback(
    async (facility: GolfFacilityMapDto) => {
      if (!facility.selectable && facility.coordinateStatus === 'MISSING') {
        setActionError('위치 정보 확인 중인 시설입니다.');
        return;
      }
      setActivatingId(facility.id);
      setActionError(null);
      try {
        const activated = await api.activateGolfFacilityVenue(facility.id);
        onChange(
          venueSelectionFromVenueDto({
            venueId: activated.venueId,
            name: facility.displayName || activated.name,
            address: facility.roadAddress,
            roadAddress: facility.roadAddress,
            phone: facility.phone,
            latitude: facility.latitude ?? undefined,
            longitude: facility.longitude ?? undefined,
            golfFacilityId: facility.id,
            facilityType: facility.facilityType,
          }),
        );
        setSearchOpen(false);
        setChangeOpen(false);
      } catch {
        setActionError('장소를 선택할 수 없습니다. 다시 시도해 주세요.');
      } finally {
        setActivatingId(null);
      }
    },
    [api, onChange],
  );

  const runSearch = useCallback(async () => {
    const q = searchQuery.trim();
    if (q.length < 1) return;
    setSearchLoading(true);
    setActionError(null);
    try {
      const result = await api.searchGolfFacilities({ q, limit: 30 });
      setSearchHits(result.items);
    } catch {
      setSearchHits([]);
      setActionError('검색에 실패했습니다.');
    } finally {
      setSearchLoading(false);
    }
  }, [api, searchQuery]);

  const saveCustom = useCallback(async () => {
    const name = customName.trim();
    const address = customAddress.trim();
    if (!name || !address) {
      setActionError('장소명과 주소를 입력해 주세요.');
      return;
    }
    setCustomSaving(true);
    setActionError(null);
    try {
      const created = await api.createCustomVenue({
        name,
        address,
        phone: customPhone.trim() || null,
      });
      onChange(
        venueSelectionFromVenueDto({
          venueId: created.venueId,
          name: created.name,
          address: created.roadAddress ?? created.address,
          roadAddress: created.roadAddress,
          phone: created.phone,
          latitude: created.latitude,
          longitude: created.longitude,
          facilityType: null,
        }),
      );
      setCustomOpen(false);
      setChangeOpen(false);
    } catch {
      setActionError('직접 입력 장소를 저장할 수 없습니다.');
    } finally {
      setCustomSaving(false);
    }
  }, [api, customAddress, customName, customPhone, onChange]);

  const toggleFavorite = useCallback(async () => {
    if (!selected?.venueId) return;
    try {
      if (selected.isFavorite) {
        await api.removeVenueFavorite(selected.venueId);
        onChange({ ...selected, isFavorite: false });
      } else {
        await api.addVenueFavorite({ venueId: selected.venueId });
        onChange({ ...selected, isFavorite: true });
      }
      void loadLists();
    } catch {
      setActionError('즐겨찾기를 변경할 수 없습니다.');
    }
  }, [api, loadLists, onChange, selected]);

  const openAction = useCallback(
    (action: PickerAction) => {
      setChangeOpen(false);
      setActionError(null);
      if (action === 'map') onPickFromMap();
      else if (action === 'search') setSearchOpen(true);
      else if (action === 'custom') setCustomOpen(true);
    },
    [onPickFromMap],
  );

  const facilitySubtitle = useMemo(() => {
    if (!selected?.facilityType) return null;
    return facilityTypeLabel(selected.facilityType);
  }, [selected?.facilityType]);

  const bothListsEmpty = !loadingLists && recent.length === 0 && favorites.length === 0;

  const placeActions = useMemo(
    () =>
      restrictToFacilityPick
        ? PLACE_ACTIONS.filter((a) => a.action === 'map' || a.action === 'search')
        : PLACE_ACTIONS,
    [restrictToFacilityPick],
  );

  const renderPlaceActions = (size: 'sm' | 'md' = 'sm') => (
    <View style={styles.actionCol}>
      {placeActions.map(({ action, label, icon }) => (
        <Button
          key={action ?? 'none'}
          label={label}
          variant="secondary"
          size={size}
          leftIcon={icon}
          onPress={() => openAction(action)}
        />
      ))}
    </View>
  );

  if (venueSelectionHasPlace(selected)) {
    return (
      <View style={styles.block}>
        <View style={styles.rowBetween}>
          <Text variant="bodyStrong">장소</Text>
          <Pressable onPress={() => setChangeOpen(true)} hitSlop={8}>
            <Text variant="caption" style={{ color: theme.colors.action.primary }}>
              변경
            </Text>
          </Pressable>
        </View>
        <Card>
          <View style={styles.rowBetween}>
            <Text variant="bodyStrong" style={styles.venueName}>
              {selected.name}
            </Text>
            <Pressable onPress={() => void toggleFavorite()} hitSlop={8}>
              <Text
                variant="body"
                tone={selected.isFavorite ? 'primary' : 'tertiary'}
                style={selected.isFavorite ? { color: theme.colors.action.primary } : undefined}
              >
                {selected.isFavorite ? '★' : '☆'}
              </Text>
            </Pressable>
          </View>
          <Text variant="caption" tone="secondary" numberOfLines={2}>
            {selected.address}
          </Text>
          {selected.phone ? (
            <Text variant="caption" tone="secondary">
              {selected.phone}
            </Text>
          ) : null}
          {facilitySubtitle ? (
            <Text variant="caption" tone="tertiary">
              {facilitySubtitle}
            </Text>
          ) : null}
        </Card>
        {renderActionSheet()}
        {renderSearchModal()}
        {renderCustomModal()}
      </View>
    );
  }

  return (
    <View style={styles.block}>
      <Text variant="bodyStrong">장소</Text>

      <View style={[styles.emptyState, themed.emptyState]}>
        <Text variant="body" tone="secondary">
          선택된 장소가 없습니다
        </Text>
        <Text variant="caption" tone="tertiary">
          아래 방법 중 하나로 장소를 선택해주세요.
        </Text>
      </View>

      {renderPlaceActions()}

      {loadingLists ? (
        <ActivityIndicator color={theme.colors.action.primary} style={styles.loader} />
      ) : bothListsEmpty ? (
        <Text variant="caption" tone="tertiary" style={styles.compactEmpty}>
          최근 또는 즐겨찾기한 장소가 아직 없습니다.
        </Text>
      ) : (
        <>
          <VenueListSection
            title="최근 장소"
            empty="최근 사용한 장소가 없습니다."
            items={recent}
            onSelect={selectPickerItem}
            listRowBorder={themed.listRowBorder}
            compactEmpty
          />
          <VenueListSection
            title="즐겨찾기"
            empty="즐겨찾기한 장소가 없습니다."
            items={favorites}
            onSelect={selectPickerItem}
            showStar
            listRowBorder={themed.listRowBorder}
            compactEmpty
          />
        </>
      )}

      {actionError ? (
        <Text variant="caption" tone="error">
          {actionError}
        </Text>
      ) : null}

      {renderSearchModal()}
      {renderCustomModal()}
    </View>
  );

  function renderActionSheet() {
    return (
      <Modal visible={changeOpen} transparent animationType="fade" onRequestClose={() => setChangeOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setChangeOpen(false)}>
          <View style={[styles.sheet, themed.sheet]}>
            <Text variant="sectionTitle" style={styles.sheetTitle}>
              장소 변경
            </Text>
            {renderPlaceActions('md')}
            <Button label="취소" variant="secondary" onPress={() => setChangeOpen(false)} />
          </View>
        </Pressable>
      </Modal>
    );
  }

  function renderSearchModal() {
    return (
      <Modal visible={searchOpen} animationType="slide" onRequestClose={() => setSearchOpen(false)}>
        <View style={[styles.modal, themed.modal]}>
          <Text variant="sectionTitle">주소 · 상호 검색</Text>
          <Text variant="caption" tone="secondary">
            쪼인존 시설 DB 기준 · 예: 아차산, 광진, 골프존
          </Text>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="검색어 입력"
            placeholderTextColor={theme.colors.text.tertiary}
            style={[styles.input, themed.input]}
            returnKeyType="search"
            onSubmitEditing={() => void runSearch()}
          />
          <Button label={searchLoading ? '검색 중…' : '검색'} onPress={() => void runSearch()} loading={searchLoading} />
          <View style={styles.hitList}>
            {searchHits.map((hit) => (
              <Pressable
                key={hit.id}
                style={[styles.hitRow, themed.hitRowBorder]}
                onPress={() => void activateFacility(hit)}
                disabled={activatingId === hit.id}
              >
                <Text variant="bodyStrong">{hit.displayName}</Text>
                <Text variant="caption" tone="secondary" numberOfLines={2}>
                  {hit.roadAddress ?? ''}
                </Text>
                {activatingId === hit.id ? (
                  <ActivityIndicator color={theme.colors.action.primary} size="small" />
                ) : null}
              </Pressable>
            ))}
          </View>
          <Button label="닫기" variant="secondary" onPress={() => setSearchOpen(false)} />
        </View>
      </Modal>
    );
  }

  function renderCustomModal() {
    return (
      <Modal visible={customOpen} animationType="slide" onRequestClose={() => setCustomOpen(false)}>
        <View style={[styles.modal, themed.modal]}>
          <Text variant="sectionTitle">장소 직접 입력</Text>
          <TextInput
            value={customName}
            onChangeText={setCustomName}
            placeholder="장소명"
            placeholderTextColor={theme.colors.text.tertiary}
            style={[styles.input, themed.input]}
          />
          <TextInput
            value={customAddress}
            onChangeText={setCustomAddress}
            placeholder="주소"
            placeholderTextColor={theme.colors.text.tertiary}
            style={[styles.input, themed.input]}
          />
          <TextInput
            value={customPhone}
            onChangeText={setCustomPhone}
            placeholder="전화번호 (선택)"
            placeholderTextColor={theme.colors.text.tertiary}
            style={[styles.input, themed.input]}
            keyboardType="phone-pad"
          />
          <Button label="저장" onPress={() => void saveCustom()} loading={customSaving} />
          <Button label="취소" variant="secondary" onPress={() => setCustomOpen(false)} />
        </View>
      </Modal>
    );
  }
}

function VenueListSection({
  title,
  empty,
  items,
  onSelect,
  showStar = false,
  listRowBorder,
  compactEmpty = false,
}: {
  title: string;
  empty: string;
  items: UserVenuePickerItemDto[];
  onSelect: (item: UserVenuePickerItemDto) => void;
  showStar?: boolean;
  listRowBorder: { borderBottomColor: string };
  compactEmpty?: boolean;
}) {
  if (!items.length) {
    if (compactEmpty) return null;
    return (
      <View style={styles.listSection}>
        <Text variant="caption" tone="secondary">
          {title}
        </Text>
        <Text variant="caption" tone="tertiary">
          {empty}
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.listSection}>
      <Text variant="caption" tone="secondary">
        {title}
      </Text>
      {items.map((item) => (
        <Pressable key={item.venueId} style={[styles.listRow, listRowBorder]} onPress={() => onSelect(item)}>
          <View style={styles.listRowText}>
            <Text variant="body">
              {showStar ? '★ ' : ''}
              {item.name}
            </Text>
            <Text variant="caption" tone="secondary" numberOfLines={1}>
              {item.roadAddress ?? item.address ?? ''}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.sm },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  venueName: { flex: 1 },
  emptyState: {
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xxs,
  },
  compactEmpty: {
    marginTop: spacing.xxs,
  },
  loader: { marginVertical: spacing.xs },
  actionCol: { gap: spacing.sm },
  listSection: { gap: spacing.xxs },
  listRow: {
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  listRowText: { gap: 2 },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  sheetTitle: { marginBottom: spacing.xxs },
  modal: {
    flex: 1,
    padding: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  input: {
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  hitList: { flex: 1, gap: spacing.xxs },
  hitRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
});
