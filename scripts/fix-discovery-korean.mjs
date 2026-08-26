/**
 * Restore discovery UI Korean copy + map-first layout helpers.
 * Source is ASCII-only (\u escapes) so encoding cannot corrupt Hangul.
 */
import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();

function write(rel, body) {
  const full = path.join(cwd, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, body.replace(/\n/g, '\n'), 'utf8');
  const hangul = body.match(/[\uAC00-\uD7A3]{2,}/g)?.slice(0, 5) ?? [];
  if (hangul.length === 0) {
    throw new Error(`no hangul written: ${rel}`);
  }
  console.log('OK', rel, '->', hangul.join(', '));
}

const KO = {
  thisWeek: '\uC774\uBC88 \uC8FC',
  prevWeek: '\uC774\uC804 \uC8FC',
  nextWeek: '\uB2E4\uC74C \uC8FC',
  today: '\uC624\uB298',
  selected: '\uC120\uD0DD\uB428',
  join: '\uC870\uC778',
  ga: '\uAC1C',
  yoil: '\uC694\uC77C',
  il: '\uC77C',
  nearby: '\uB0B4 \uC8FC\uBCC0',
  changeRegion: '\uC9C0\uC5ED \uBCC0\uACBD',
  selectRegion: '\uC9C0\uC5ED \uC120\uD0DD',
  regionHint:
    '\uC2DC\uB85C \uC120\uD0DD \uD6C4 \uAD6C\uAD70\uC744 \uACE0\uB974\uC138\uC694',
  save: '\uC800\uC7A5',
  favSave: '\uC990\uACA8\uCC3E\uAE30 \uC800\uC7A5',
  close: '\uB2EB\uAE30',
  seoul: '\uC11C\uC6B8\uD2B9\uBCC4\uC2DC',
  all: '\uC804\uCCB4',
  joinable: '\uCC38\uAC00 \uAC00\uB2A5',
  byTime: '\uC2DC\uAC04\uC21C',
  byDist: '\uAC70\uB9AC\uC21C',
  ongoing: '\uC9C0\uAE08 \uC9C4\uD589 \uC911',
  upcoming: '\uC608\uC815\uB41C \uC870\uC778',
  selectedDayJoins: '\uC120\uD0DD\uD55C \uB0A0 \uC870\uC778',
  empty:
    '\uC120\uD0DD\uD55C \uB0A0\uC9DC\uB85C \uC9C0\uC5ED\uC5D0 \uC870\uC778\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.',
  goToday: '\uC624\uB298\uB85C \uC774\uB3D9',
  seeMap: '\uC9C0\uB3C4\uC5D0\uC11C \uBCF4\uAE30',
  createJoin: '\uC870\uC778 \uB9CC\uB4E4\uAE30',
  locDenied:
    '\uC704\uCE58 \uAD8C\uD55C\uC774 \uC5C6\uC5B4 \uB0B4 \uC8FC\uBCC0 \uC870\uC778\uC744 \uBD88\uB7EC\uC62C \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uC9C0\uC5ED\uC744 \uC120\uD0DD\uD574 \uC8FC\uC138\uC694.',
  locLoading: '\uC704\uCE58\uB97C \uD655\uC778\uD558\uB294 \uC911\uC785\uB2C8\uB2E4.',
  loadFail: '\uC870\uC778\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.',
  disabled: '\uC0AC\uC6A9 \uBD88\uAC00',
  list: '\uB9AC\uC2A4\uD2B8',
  map: '\uC9C0\uB3C4',
};

write(
  'apps/mobile/src/features/explore/discovery/components/WeekStrip.tsx',
  `import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, spacing, useTheme } from '@jjoin/design-system';
import { buildWeekStrip, type WeekDayCell } from '@jjoin/domain';

type Props = {
  weekAnchorDate: string;
  selectedDate: string;
  dayCounts?: Record<string, number>;
  onSelectDate: (date: string) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  compact?: boolean;
};

export function WeekStrip({
  weekAnchorDate,
  selectedDate,
  dayCounts,
  onSelectDate,
  onPrevWeek,
  onNextWeek,
  compact = false,
}: Props) {
  const theme = useTheme();
  const cells = useMemo(() => buildWeekStrip(weekAnchorDate), [weekAnchorDate]);
  const gold = theme.colors.action.primary;
  const rangeLabel = useMemo(() => {
    if (cells.length === 0) return '${KO.thisWeek}';
    const first = cells[0]!;
    const last = cells[cells.length - 1]!;
    return \`${KO.thisWeek} \${Number(first.date.slice(5, 7))}.\${first.dayOfMonth} - \${Number(last.date.slice(5, 7))}.\${last.dayOfMonth}\`;
  }, [cells]);

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      {!compact ? (
        <View style={styles.navRow}>
          <Pressable
            onPress={onPrevWeek}
            accessibilityRole="button"
            accessibilityLabel="${KO.prevWeek}"
            hitSlop={8}
            style={styles.navBtn}
          >
            <Text variant="meta" tone="secondary">
              {'\\u2039'}
            </Text>
          </Pressable>
          <Text variant="meta" tone="tertiary">
            {rangeLabel}
          </Text>
          <Pressable
            onPress={onNextWeek}
            accessibilityRole="button"
            accessibilityLabel="${KO.nextWeek}"
            hitSlop={8}
            style={styles.navBtn}
          >
            <Text variant="meta" tone="secondary">
              {'\\u203A'}
            </Text>
          </Pressable>
        </View>
      ) : null}
      <View style={styles.strip}>
        {cells.map((cell) => (
          <DayCell
            key={cell.date}
            cell={cell}
            selected={cell.date === selectedDate}
            count={dayCounts?.[cell.date] ?? 0}
            gold={gold}
            compact={compact}
            onPress={() => onSelectDate(cell.date)}
          />
        ))}
      </View>
    </View>
  );
}

function DayCell({
  cell,
  selected,
  count,
  gold,
  compact,
  onPress,
}: {
  cell: WeekDayCell;
  selected: boolean;
  count: number;
  gold: string;
  compact: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const a11y = [
    \`\${cell.weekdayLabel}${KO.yoil} \${cell.dayOfMonth}${KO.il}\`,
    cell.isToday ? '${KO.today}' : null,
    selected ? '${KO.selected}' : null,
    count > 0 ? \`${KO.join} \${count}${KO.ga}\` : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={a11y}
      style={styles.day}
    >
      <Text
        variant="meta"
        tone={selected ? 'primary' : 'tertiary'}
        style={selected ? { color: gold } : undefined}
      >
        {cell.weekdayLabel}
      </Text>
      <View
        style={[
          compact ? styles.dayNumCompact : styles.dayNum,
          selected
            ? { backgroundColor: gold, borderRadius: theme.radius.md }
            : null,
        ]}
      >
        <Text
          variant={compact ? 'meta' : 'body'}
          tone="primary"
          style={selected ? { color: theme.colors.text.onGold } : undefined}
        >
          {cell.dayOfMonth}
        </Text>
      </View>
      {!compact ? (
        <Text variant="meta" tone="tertiary" style={{ fontSize: 10 }}>
          {cell.isToday ? '${KO.today}' : count > 0 ? String(count) : ' '}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  wrapCompact: {
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  strip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  day: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    minWidth: 0,
  },
  dayNum: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumCompact: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
`,
);

write(
  'apps/mobile/src/features/explore/discovery/components/RegionQuickPicks.tsx',
  `import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, spacing, useTheme } from '@jjoin/design-system';
import type { JoinDiscoveryRegion } from '@jjoin/domain';

export type RegionChip = {
  key: string;
  region: JoinDiscoveryRegion;
  disabled?: boolean;
};

type Props = {
  chips: RegionChip[];
  selectedKey: string;
  onSelect: (region: JoinDiscoveryRegion) => void;
  onChangeRegion: () => void;
};

export function RegionQuickPicks({
  chips,
  selectedKey,
  onSelect,
  onChangeRegion,
}: Props) {
  const theme = useTheme();
  const gold = theme.colors.action.primary;

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {chips.map((chip) => {
          const selected = chip.key === selectedKey;
          return (
            <Pressable
              key={chip.key}
              disabled={chip.disabled}
              onPress={() => onSelect(chip.region)}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled: !!chip.disabled }}
              accessibilityLabel={\`\${chip.region.label}\${selected ? ', ${KO.selected}' : ''}\${chip.disabled ? ', ${KO.disabled}' : ''}\`}
              style={[
                styles.chip,
                {
                  borderColor: selected ? gold : theme.colors.border.subtle,
                  backgroundColor: selected
                    ? theme.colors.surface.card
                    : theme.colors.surface.base,
                  opacity: chip.disabled ? 0.45 : 1,
                },
              ]}
            >
              <Text
                variant="meta"
                style={selected ? { color: gold } : undefined}
                tone={selected ? 'primary' : 'secondary'}
              >
                {chip.region.label}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={onChangeRegion}
          accessibilityRole="button"
          accessibilityLabel="${KO.changeRegion}"
          style={[
            styles.chip,
            {
              borderColor: theme.colors.border.subtle,
              backgroundColor: theme.colors.surface.base,
            },
          ]}
        >
          <Text variant="meta" tone="secondary">
            ${KO.changeRegion}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: spacing.xs,
  },
  row: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
  },
});
`,
);

write(
  'apps/mobile/src/features/explore/discovery/components/RegionPickerSheet.tsx',
  `import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Button, Text, Spacer, Stack, spacing, useTheme } from '@jjoin/design-system';
import { ADMIN_SIDO_GROUPS, type AdminDistrict } from '@jjoin/domain';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (district: AdminDistrict) => void;
  onSaveFavorite?: (district: AdminDistrict) => void;
};

export function RegionPickerSheet({
  visible,
  onClose,
  onSelect,
  onSaveFavorite,
}: Props) {
  const theme = useTheme();
  const gold = theme.colors.action.primary;
  const [sido, setSido] = useState(ADMIN_SIDO_GROUPS[0]?.sido ?? '${KO.seoul}');
  const group = useMemo(
    () => ADMIN_SIDO_GROUPS.find((g) => g.sido === sido) ?? ADMIN_SIDO_GROUPS[0],
    [sido],
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
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
        <Text variant="sectionTitle" tone="primary">
          ${KO.selectRegion}
        </Text>
        <Text variant="meta" tone="tertiary">
          ${KO.regionHint}
        </Text>
        <Spacer size="sm" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sidoRow}
        >
          {ADMIN_SIDO_GROUPS.map((g) => {
            const selected = g.sido === sido;
            return (
              <Pressable
                key={g.sido}
                onPress={() => setSido(g.sido)}
                style={[
                  styles.sidoChip,
                  {
                    borderColor: selected ? gold : theme.colors.border.subtle,
                  },
                ]}
              >
                <Text
                  variant="meta"
                  style={selected ? { color: gold } : undefined}
                >
                  {g.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Spacer size="sm" />
        <ScrollView style={styles.list}>
          <Stack gap="sm">
            {(group?.districts ?? []).map((d) => (
              <View key={\`\${d.sido}|\${d.sigungu}\`} style={styles.districtRow}>
                <Pressable
                  style={styles.districtMain}
                  onPress={() => {
                    onSelect(d);
                    onClose();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={\`\${d.sido} \${d.sigungu}\`}
                >
                  <Text variant="body" tone="primary">
                    {d.label}
                  </Text>
                  <Text variant="meta" tone="tertiary">
                    {d.sido}
                  </Text>
                </Pressable>
                {onSaveFavorite ? (
                  <Pressable
                    onPress={() => onSaveFavorite(d)}
                    accessibilityRole="button"
                    accessibilityLabel={\`\${d.label} ${KO.favSave}\`}
                    hitSlop={8}
                  >
                    <Text variant="meta" style={{ color: gold }}>
                      ${KO.save}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
          </Stack>
        </ScrollView>
        <Spacer size="md" />
        <Button label="${KO.close}" variant="secondary" onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    maxHeight: '70%',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  sidoRow: {
    gap: spacing.sm,
  },
  sidoChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  list: {
    maxHeight: 320,
  },
  districtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  districtMain: {
    flex: 1,
    gap: 2,
    paddingVertical: spacing.sm,
  },
});
`,
);

write(
  'apps/mobile/src/features/explore/discovery/components/DiscoverListPanel.tsx',
  `import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';
import {
  Button,
  Text,
  Section,
  Spacer,
  Stack,
  spacing,
  useTheme,
} from '@jjoin/design-system';
import { DEFAULT_NEARBY_RADIUS_METERS, localDayKey } from '@jjoin/domain';
import type { DiscoverJoinsResponse } from '@jjoin/types';
import { getSecureSessionStore } from '../../../../session/SessionContext';
import { getApiClient } from '../../../../lib/api';
import { useJoinDiscovery } from '../JoinDiscoveryContext';
import { fetchDiscoverJoins } from '../api/join-discover-api';
import { DiscoverJoinCard } from './DiscoverJoinCard';

function joinDetailHref(joinId: string): Href {
  return { pathname: '/join/[joinId]', params: { joinId } } as Href;
}

type Props = {
  locationDenied: boolean;
  deviceLocation: { latitude: number; longitude: number } | null;
};

export function DiscoverListPanel({ locationDenied, deviceLocation }: Props) {
  const theme = useTheme();
  const router = useRouter();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const { filter, setDate, patchFilter } = useJoinDiscovery();
  const [data, setData] = useState<DiscoverJoinsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestSeq = useRef(0);
  const gold = theme.colors.action.primary;

  const load = useCallback(async () => {
    const seq = ++requestSeq.current;
    const abort = new AbortController();
    setLoading(true);
    setError(null);
    try {
      if (filter.region.mode === 'NEARBY' && !deviceLocation) {
        if (seq === requestSeq.current) {
          setData(null);
          setError(locationDenied ? '${KO.locDenied}' : '${KO.locLoading}');
          setLoading(false);
        }
        return () => abort.abort();
      }

      const regionQuery =
        filter.region.mode === 'NEARBY'
          ? {
              regionMode: 'NEARBY' as const,
              lat: deviceLocation!.latitude,
              lng: deviceLocation!.longitude,
              radiusMeters: DEFAULT_NEARBY_RADIUS_METERS,
            }
          : {
              regionMode: 'DISTRICT' as const,
              sido: filter.region.sido,
              sigungu: filter.region.sigungu,
              lat: deviceLocation?.latitude,
              lng: deviceLocation?.longitude,
            };

      const list = await fetchDiscoverJoins(
        api,
        {
          date: filter.date,
          sort: filter.sort,
          joinability: filter.joinability,
          ...regionQuery,
        },
        abort.signal,
      );

      if (seq !== requestSeq.current) return () => abort.abort();
      setData(list);
    } catch (e) {
      if (seq !== requestSeq.current) return () => abort.abort();
      if ((e as Error)?.name === 'AbortError') return () => abort.abort();
      setData(null);
      setError('${KO.loadFail}');
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
    return () => abort.abort();
  }, [api, filter, deviceLocation, locationDenied]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    void (async () => {
      cleanup = await load();
    })();
    return () => cleanup?.();
  }, [load]);

  const todayKey = localDayKey(new Date());
  const upcomingTitle =
    filter.date === todayKey ? '${KO.upcoming}' : '${KO.selectedDayJoins}';
  const empty = !loading && !error && (data?.totalCount ?? 0) === 0;

  return (
    <View style={styles.root}>
      <View style={styles.filterRow}>
        {(['ALL', 'JOINABLE'] as const).map((id) => {
          const selected = filter.joinability === id;
          return (
            <Pressable
              key={id}
              onPress={() => patchFilter({ joinability: id })}
              style={[
                styles.filterChip,
                {
                  borderColor: selected ? gold : theme.colors.border.subtle,
                },
              ]}
            >
              <Text
                variant="meta"
                style={selected ? { color: gold } : undefined}
              >
                {id === 'ALL' ? '${KO.all}' : '${KO.joinable}'}
              </Text>
            </Pressable>
          );
        })}
        {(['TIME', 'DISTANCE'] as const).map((id) => {
          const selected = filter.sort === id;
          return (
            <Pressable
              key={id}
              onPress={() => patchFilter({ sort: id })}
              style={[
                styles.filterChip,
                {
                  borderColor: selected ? gold : theme.colors.border.subtle,
                },
              ]}
            >
              <Text
                variant="meta"
                style={selected ? { color: gold } : undefined}
              >
                {id === 'TIME' ? '${KO.byTime}' : '${KO.byDist}'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => void load()} />
        }
      >
        {loading && !data ? <ActivityIndicator color={gold} /> : null}
        {error ? (
          <Text variant="meta" tone="tertiary">
            {error}
          </Text>
        ) : null}
        {empty ? (
          <Stack gap="md">
            <Text variant="body" tone="secondary">
              ${KO.empty}
            </Text>
            <Button
              label="${KO.goToday}"
              variant="secondary"
              onPress={() => setDate(todayKey)}
            />
            <Button
              label="${KO.seeMap}"
              variant="secondary"
              onPress={() => patchFilter({ view: 'MAP' })}
            />
            <Button
              label="${KO.createJoin}"
              onPress={() => router.push('/(tabs)/create')}
            />
          </Stack>
        ) : null}

        {(data?.ongoing.length ?? 0) > 0 ? (
          <Section title="${KO.ongoing}">
            <Stack gap="md">
              {data!.ongoing.map((join) => (
                <DiscoverJoinCard
                  key={join.joinId}
                  join={join}
                  onPress={() => router.push(joinDetailHref(join.joinId))}
                  onJoinPress={() => router.push(joinDetailHref(join.joinId))}
                />
              ))}
            </Stack>
          </Section>
        ) : null}

        {(data?.upcoming.length ?? 0) > 0 ? (
          <>
            <Spacer size="md" />
            <Section title={upcomingTitle}>
              <Stack gap="md">
                {data!.upcoming.map((join) => (
                  <DiscoverJoinCard
                    key={join.joinId}
                    join={join}
                    onPress={() => router.push(joinDetailHref(join.joinId))}
                    onJoinPress={() => router.push(joinDetailHref(join.joinId))}
                  />
                ))}
              </Stack>
            </Section>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
});
`,
);

write(
  'apps/mobile/src/features/explore/discovery/components/DiscoveryFilterChrome.tsx',
  `import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import {
  DEFAULT_NEARBY_RADIUS_METERS,
  DEFAULT_REGION_QUICK_PICKS,
  regionIdentityKey,
  sundayOfWeek,
  type AdminDistrict,
} from '@jjoin/domain';
import { getSecureSessionStore } from '../../../../session/SessionContext';
import { getApiClient } from '../../../../lib/api';
import { useJoinDiscovery } from '../JoinDiscoveryContext';
import {
  fetchDiscoverWeeklyCounts,
  fetchJoinRegionPreferences,
  saveJoinRegionPreference,
} from '../api/join-discover-api';
import { WeekStrip } from './WeekStrip';
import { RegionQuickPicks, type RegionChip } from './RegionQuickPicks';
import { RegionPickerSheet } from './RegionPickerSheet';

type Props = {
  locationDenied: boolean;
  deviceLocation: { latitude: number; longitude: number } | null;
};

export function DiscoveryFilterChrome({
  locationDenied,
  deviceLocation,
}: Props) {
  const { filter, setDate, setRegion, shiftWeek } = useJoinDiscovery();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dayCounts, setDayCounts] = useState<Record<string, number>>({});
  const [prefChips, setPrefChips] = useState<RegionChip[]>([]);

  const chips: RegionChip[] = useMemo(() => {
    const nearbyDisabled = locationDenied && !deviceLocation;
    const base: RegionChip[] = [
      {
        key: 'NEARBY',
        region: { mode: 'NEARBY', label: '${KO.nearby}' },
        disabled: nearbyDisabled,
      },
    ];
    const seen = new Set<string>(['NEARBY']);
    for (const p of prefChips) {
      if (seen.has(p.key)) continue;
      seen.add(p.key);
      base.push(p);
    }
    for (const d of DEFAULT_REGION_QUICK_PICKS) {
      const key = \`DISTRICT:\${d.sido}|\${d.sigungu}\`;
      if (seen.has(key)) continue;
      seen.add(key);
      base.push({
        key,
        region: {
          mode: 'DISTRICT',
          sido: d.sido,
          sigungu: d.sigungu,
          label: d.label,
        },
      });
    }
    return base.slice(0, 5);
  }, [prefChips, locationDenied, deviceLocation]);

  const loadPrefs = useCallback(async () => {
    try {
      const res = await fetchJoinRegionPreferences(api);
      setPrefChips(
        res.items.map((item) => ({
          key: \`DISTRICT:\${item.sido}|\${item.sigungu}\`,
          region: {
            mode: 'DISTRICT' as const,
            sido: item.sido,
            sigungu: item.sigungu,
            label: item.label,
          },
        })),
      );
    } catch {
      setPrefChips([]);
    }
  }, [api]);

  useEffect(() => {
    void loadPrefs();
  }, [loadPrefs]);

  useEffect(() => {
    const abort = new AbortController();
    void (async () => {
      try {
        if (filter.region.mode === 'NEARBY' && !deviceLocation) {
          setDayCounts({});
          return;
        }
        const regionQuery =
          filter.region.mode === 'NEARBY'
            ? {
                regionMode: 'NEARBY' as const,
                lat: deviceLocation!.latitude,
                lng: deviceLocation!.longitude,
                radiusMeters: DEFAULT_NEARBY_RADIUS_METERS,
              }
            : {
                regionMode: 'DISTRICT' as const,
                sido: filter.region.sido,
                sigungu: filter.region.sigungu,
              };
        const weekly = await fetchDiscoverWeeklyCounts(
          api,
          { weekStart: sundayOfWeek(filter.weekAnchorDate), ...regionQuery },
          abort.signal,
        );
        const counts: Record<string, number> = {};
        for (const day of weekly.days) counts[day.date] = day.count;
        setDayCounts(counts);
      } catch {
        if (!abort.signal.aborted) setDayCounts({});
      }
    })();
    return () => abort.abort();
  }, [api, filter.region, filter.weekAnchorDate, deviceLocation]);

  return (
    <View>
      <WeekStrip
        weekAnchorDate={filter.weekAnchorDate}
        selectedDate={filter.date}
        dayCounts={dayCounts}
        onSelectDate={setDate}
        onPrevWeek={() => shiftWeek(-1)}
        onNextWeek={() => shiftWeek(1)}
      />
      <RegionQuickPicks
        chips={chips}
        selectedKey={regionIdentityKey(filter.region)}
        onSelect={(region) => {
          if (region.mode === 'NEARBY' && locationDenied && !deviceLocation) {
            return;
          }
          setRegion(region);
        }}
        onChangeRegion={() => setPickerOpen(true)}
      />
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
          }).then(() => loadPrefs());
        }}
      />
    </View>
  );
}
`,
);

write(
  'apps/mobile/src/features/explore/discovery/components/MapDiscoveryChrome.tsx',
  `import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text, spacing, useTheme } from '@jjoin/design-system';
import {
  localDayKey,
  regionIdentityKey,
  type AdminDistrict,
} from '@jjoin/domain';
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
  const today = localDayKey(new Date());
  const m = Number(dateKey.slice(5, 7));
  const d = Number(dateKey.slice(8, 10));
  if (dateKey === today) return \`${KO.today} \${m}/\${d}\`;
  return \`\${m}/\${d}\`;
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
  const [regionOpen, setRegionOpen] = useState(false);
  const gold = theme.colors.action.primary;

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
          {formatDateChip(filter.date)} {'\\u25BE'}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => setRegionOpen(true)}
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
          {filter.region.label} {'\\u25BE'}
        </Text>
      </Pressable>

      <Modal
        visible={dateOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setDateOpen(false)}
      >
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
      </Modal>

      <RegionPickerSheet
        visible={regionOpen}
        onClose={() => setRegionOpen(false)}
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
      {locationDenied && !deviceLocation && regionIdentityKey(filter.region) === 'NEARBY' ? (
        <Text variant="meta" tone="tertiary" style={styles.hint}>
          ${KO.locDenied}
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
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    paddingBottom: spacing.lg,
  },
  hint: {
    flexBasis: '100%',
  },
});
`,
);

write(
  'apps/mobile/src/features/explore/discovery/ExploreDiscoveryScreen.tsx',
  `import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Text, spacing, useTheme } from '@jjoin/design-system';
import { JoinDiscoveryProvider, useJoinDiscovery } from './JoinDiscoveryContext';
import { DiscoverListPanel } from './components/DiscoverListPanel';
import { DiscoveryFilterChrome } from './components/DiscoveryFilterChrome';
import { MapDiscoveryChrome } from './components/MapDiscoveryChrome';
import { ExploreMapScreen } from '../screens/ExploreMapScreen';
import type { MapCoordinate } from '../model/map-types';

export function ExploreDiscoveryScreen() {
  return (
    <JoinDiscoveryProvider>
      <ExploreDiscoveryBody />
    </JoinDiscoveryProvider>
  );
}

function ExploreDiscoveryBody() {
  const theme = useTheme();
  const { filter, patchFilter } = useJoinDiscovery();
  const [deviceLocation, setDeviceLocation] = useState<MapCoordinate | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const gold = theme.colors.action.primary;
  const isList = filter.view === 'LIST';

  useEffect(() => {
    void (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationDenied(true);
        return;
      }
      try {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setDeviceLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      } catch {
        setLocationDenied(true);
      }
    })();
  }, []);

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.colors.surface.base }]}
      edges={['top']}
    >
      <View style={styles.viewSwitch}>
        {(['LIST', 'MAP'] as const).map((view) => {
          const selected = filter.view === view;
          return (
            <Pressable
              key={view}
              onPress={() => patchFilter({ view })}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={view === 'LIST' ? '${KO.list}' : '${KO.map}'}
              style={[
                styles.viewChip,
                {
                  borderColor: selected ? gold : theme.colors.border.subtle,
                  backgroundColor: selected
                    ? theme.colors.surface.card
                    : 'transparent',
                },
              ]}
            >
              <Text
                variant="meta"
                style={selected ? { color: gold } : undefined}
              >
                {view === 'LIST' ? '${KO.list}' : '${KO.map}'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isList ? (
        <>
          <DiscoveryFilterChrome
            locationDenied={locationDenied}
            deviceLocation={deviceLocation}
          />
          <DiscoverListPanel
            locationDenied={locationDenied}
            deviceLocation={deviceLocation}
          />
        </>
      ) : (
        <>
          <MapDiscoveryChrome
            locationDenied={locationDenied}
            deviceLocation={deviceLocation}
          />
          <View style={styles.mapHost}>
            <ExploreMapScreen
              discoveryLinked
              externalLocation={deviceLocation}
              externalLocationDenied={locationDenied}
            />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  viewSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  viewChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  mapHost: {
    flex: 1,
    minHeight: 0,
  },
});
`,
);

console.log('all discovery UI files written');
