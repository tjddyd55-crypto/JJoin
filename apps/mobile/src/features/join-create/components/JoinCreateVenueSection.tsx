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
  AppText,
  Button,
  SurfaceCard,
  colors,
  radius,
  spacing,
} from '@jjoin/design-system';
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
};

type PickerAction = 'map' | 'search' | 'custom' | null;

export function JoinCreateVenueSection({ api, selected, onChange, onPickFromMap }: Props) {
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
            name: activated.name,
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

  if (venueSelectionHasPlace(selected)) {
    return (
      <View style={styles.block}>
        <View style={styles.rowBetween}>
          <AppText variant="bodyStrong">장소</AppText>
          <Pressable onPress={() => setChangeOpen(true)} hitSlop={8}>
            <AppText variant="caption" color="primary">
              변경
            </AppText>
          </Pressable>
        </View>
        <SurfaceCard>
          <View style={styles.rowBetween}>
            <AppText variant="bodyStrong" style={styles.venueName}>
              {selected.name}
            </AppText>
            <Pressable onPress={() => void toggleFavorite()} hitSlop={8}>
              <AppText variant="body" color={selected.isFavorite ? 'primary' : 'textTertiary'}>
                {selected.isFavorite ? '★' : '☆'}
              </AppText>
            </Pressable>
          </View>
          <AppText variant="caption" color="textSecondary" numberOfLines={2}>
            {selected.address}
          </AppText>
          {selected.phone ? (
            <AppText variant="caption" color="textSecondary">
              {selected.phone}
            </AppText>
          ) : null}
          {facilitySubtitle ? (
            <AppText variant="caption" color="textTertiary">
              {facilitySubtitle}
            </AppText>
          ) : null}
        </SurfaceCard>
        {renderActionSheet()}
        {renderSearchModal()}
        {renderCustomModal()}
      </View>
    );
  }

  return (
    <View style={styles.block}>
      <AppText variant="bodyStrong">장소</AppText>
      <SurfaceCard compact>
        <AppText variant="body" color="textSecondary">
          장소를 선택해주세요
        </AppText>
      </SurfaceCard>

      {loadingLists ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : (
        <>
          <VenueListSection
            title="최근 장소"
            empty="최근 사용한 장소가 없습니다."
            items={recent}
            onSelect={selectPickerItem}
          />
          <VenueListSection
            title="즐겨찾기"
            empty="즐겨찾기한 장소가 없습니다."
            items={favorites}
            onSelect={selectPickerItem}
            showStar
          />
        </>
      )}

      <AppText variant="caption" color="textSecondary" style={styles.otherLabel}>
        다른 장소 찾기
      </AppText>
      <View style={styles.actionCol}>
        <Button label="지도에서 지정" variant="secondary" onPress={() => openAction('map')} />
        <Button label="주소 검색" variant="secondary" onPress={() => openAction('search')} />
        <Button label="직접 입력" variant="secondary" onPress={() => openAction('custom')} />
      </View>

      {actionError ? (
        <AppText variant="caption" color="danger">
          {actionError}
        </AppText>
      ) : null}

      {renderSearchModal()}
      {renderCustomModal()}
    </View>
  );

  function renderActionSheet() {
    return renderActionSheetInner();
  }

  function renderActionSheetInner() {
    return (
      <Modal visible={changeOpen} transparent animationType="fade" onRequestClose={() => setChangeOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setChangeOpen(false)}>
          <View style={styles.sheet}>
            <AppText variant="subtitle" style={styles.sheetTitle}>
              장소 변경
            </AppText>
            <Button label="지도에서 지정" variant="secondary" onPress={() => openAction('map')} />
            <Button label="주소 검색" variant="secondary" onPress={() => openAction('search')} />
            <Button label="직접 입력" variant="secondary" onPress={() => openAction('custom')} />
            <Button label="취소" variant="secondary" onPress={() => setChangeOpen(false)} />
          </View>
        </Pressable>
      </Modal>
    );
  }

  function renderSearchModal() {
    return (
      <Modal visible={searchOpen} animationType="slide" onRequestClose={() => setSearchOpen(false)}>
        <View style={styles.modal}>
          <AppText variant="subtitle">주소 · 상호 검색</AppText>
          <AppText variant="caption" color="textSecondary">
            JJOIN 시설 DB 기준 · 예: 아차산, 광진, 골프존
          </AppText>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="검색어 입력"
            placeholderTextColor={colors.textTertiary}
            style={styles.input}
            returnKeyType="search"
            onSubmitEditing={() => void runSearch()}
          />
          <Button label={searchLoading ? '검색 중…' : '검색'} onPress={() => void runSearch()} loading={searchLoading} />
          <View style={styles.hitList}>
            {searchHits.map((hit) => (
              <Pressable
                key={hit.id}
                style={styles.hitRow}
                onPress={() => void activateFacility(hit)}
                disabled={activatingId === hit.id}
              >
                <AppText variant="bodyStrong">{hit.displayName}</AppText>
                <AppText variant="caption" color="textSecondary" numberOfLines={2}>
                  {hit.roadAddress ?? ''}
                </AppText>
                {activatingId === hit.id ? (
                  <ActivityIndicator color={colors.primary} size="small" />
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
        <View style={styles.modal}>
          <AppText variant="subtitle">장소 직접 입력</AppText>
          <TextInput
            value={customName}
            onChangeText={setCustomName}
            placeholder="장소명"
            placeholderTextColor={colors.textTertiary}
            style={styles.input}
          />
          <TextInput
            value={customAddress}
            onChangeText={setCustomAddress}
            placeholder="주소"
            placeholderTextColor={colors.textTertiary}
            style={styles.input}
          />
          <TextInput
            value={customPhone}
            onChangeText={setCustomPhone}
            placeholder="전화번호 (선택)"
            placeholderTextColor={colors.textTertiary}
            style={styles.input}
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
}: {
  title: string;
  empty: string;
  items: UserVenuePickerItemDto[];
  onSelect: (item: UserVenuePickerItemDto) => void;
  showStar?: boolean;
}) {
  if (!items.length) {
    return (
      <View style={styles.listSection}>
        <AppText variant="caption" color="textSecondary">
          {title}
        </AppText>
        <AppText variant="caption" color="textTertiary">
          {empty}
        </AppText>
      </View>
    );
  }
  return (
    <View style={styles.listSection}>
      <AppText variant="caption" color="textSecondary">
        {title}
      </AppText>
      {items.map((item) => (
        <Pressable key={item.venueId} style={styles.listRow} onPress={() => onSelect(item)}>
          <View style={styles.listRowText}>
            <AppText variant="body">
              {showStar ? '★ ' : ''}
              {item.name}
            </AppText>
            <AppText variant="caption" color="textSecondary" numberOfLines={1}>
              {item.roadAddress ?? item.address ?? ''}
            </AppText>
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
  loader: { marginVertical: spacing.sm },
  otherLabel: { marginTop: spacing.xs },
  actionCol: { gap: spacing.sm },
  listSection: { gap: spacing.xxs },
  listRow: {
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  listRowText: { gap: 2 },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  sheetTitle: { marginBottom: spacing.xs },
  modal: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceMuted,
  },
  hitList: { flex: 1, gap: spacing.xs },
  hitRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: 2,
  },
});
