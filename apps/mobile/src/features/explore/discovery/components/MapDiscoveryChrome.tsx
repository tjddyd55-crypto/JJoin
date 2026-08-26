import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text, spacing, useTheme } from '@jjoin/design-system';
import { localDayKey, type AdminDistrict } from '@jjoin/domain';
import { getSecureSessionStore } from '../../../../session/SessionContext';
import { getApiClient } from '../../../../lib/api';
import { useJoinDiscovery } from '../JoinDiscoveryContext';
import { saveJoinRegionPreference } from '../api/join-discover-api';
import { WeekStrip } from './WeekStrip';
import { RegionPickerSheet } from './RegionPickerSheet';

type Props = {
  locationDenied: boolean;
  deviceLocation: { latitude: number; longitude: number } | null;
};

function formatDateChip(dateKey: string): string {
  const todayKey = localDayKey(new Date());
  const m = Number(dateKey.slice(5, 7));
  const d = Number(dateKey.slice(8, 10));
  if (dateKey === todayKey) return `오늘 ${m}/${d}`;
  return `${m}/${d}`;
}

/** Compact date + region controls for MAP mode (shared discovery filter SSOT). */
export function MapDiscoveryChrome({
  locationDenied,
  deviceLocation,
}: Props) {
  const theme = useTheme();
  const { filter, setDate, setRegion, shiftWeek } = useJoinDiscovery();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [dateOpen, setDateOpen] = useState(false);
  const [regionMenuOpen, setRegionMenuOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const gold = theme.colors.action.primary;
  const nearbyDisabled = locationDenied && !deviceLocation;

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => setDateOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={formatDateChip(filter.date)}
        style={[
          styles.chip,
          {
            borderColor: theme.colors.border.subtle,
            backgroundColor: theme.colors.surface.card,
          },
        ]}
      >
        <Text variant="meta" style={{ color: gold }}>
          {formatDateChip(filter.date)} {'\u25BE'}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => setRegionMenuOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={filter.region.label}
        style={[
          styles.chip,
          {
            borderColor: theme.colors.border.subtle,
            backgroundColor: theme.colors.surface.card,
          },
        ]}
      >
        <Text variant="meta" style={{ color: gold }}>
          {filter.region.label} {'\u25BE'}
        </Text>
      </Pressable>

      <Modal
        visible={dateOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setDateOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={() => setDateOpen(false)} />
          <View
            style={[
              styles.sheet,
              {
                backgroundColor: theme.colors.surface.base,
                borderTopLeftRadius: theme.radius.lg,
                borderTopRightRadius: theme.radius.lg,
              },
            ]}
          >
            <WeekStrip
              weekAnchorDate={filter.weekAnchorDate}
              selectedDate={filter.date}
              onSelectDate={(date) => {
                setDate(date);
                setDateOpen(false);
              }}
              onPrevWeek={() => shiftWeek(-1)}
              onNextWeek={() => shiftWeek(1)}
              compact
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={regionMenuOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setRegionMenuOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.backdrop}
            onPress={() => setRegionMenuOpen(false)}
          />
          <View
            style={[
              styles.menuSheet,
              {
                backgroundColor: theme.colors.surface.base,
                borderTopLeftRadius: theme.radius.lg,
                borderTopRightRadius: theme.radius.lg,
              },
            ]}
          >
            <Pressable
              disabled={nearbyDisabled}
              onPress={() => {
                setRegion({ mode: 'NEARBY', label: '내 주변' });
                setRegionMenuOpen(false);
              }}
              style={[styles.menuRow, { opacity: nearbyDisabled ? 0.45 : 1 }]}
            >
              <Text variant="body" tone="primary">
                내 주변
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setRegionMenuOpen(false);
                setPickerOpen(true);
              }}
              style={styles.menuRow}
            >
              <Text variant="body" tone="primary">
                다른 지역
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <RegionPickerSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(d: AdminDistrict) => {
          setRegion({
            mode: 'DISTRICT',
            sido: d.sido,
            sigungu: d.sigungu,
            label: d.label,
          });
        }}
        onSaveFavorite={(d) => {
          void saveJoinRegionPreference(api, {
            sido: d.sido,
            sigungu: d.sigungu,
            label: d.label,
          });
        }}
      />
      {nearbyDisabled && filter.region.mode === 'NEARBY' ? (
        <Text variant="meta" tone="tertiary" style={styles.hint}>
          위치 권한이 없어 내 주변 조인을 불러올 수 없습니다. 지역을 선택해 주세요.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
    alignItems: 'center',
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    paddingBottom: spacing.lg,
  },
  menuSheet: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  menuRow: {
    paddingVertical: spacing.md,
  },
  hint: {
    flexBasis: '100%',
  },
});
