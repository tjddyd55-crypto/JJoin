import React, { useMemo } from 'react';
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
    if (cells.length === 0) return '이번 주';
    const first = cells[0]!;
    const last = cells[cells.length - 1]!;
    return `이번 주 ${Number(first.date.slice(5, 7))}.${first.dayOfMonth} - ${Number(last.date.slice(5, 7))}.${last.dayOfMonth}`;
  }, [cells]);

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      {!compact ? (
        <View style={styles.navRow}>
          <Pressable
            onPress={onPrevWeek}
            accessibilityRole="button"
            accessibilityLabel="이전 주"
            hitSlop={8}
            style={styles.navBtn}
          >
            <Text variant="meta" tone="secondary">
              {'\u2039'}
            </Text>
          </Pressable>
          <Text variant="meta" tone="tertiary">
            {rangeLabel}
          </Text>
          <Pressable
            onPress={onNextWeek}
            accessibilityRole="button"
            accessibilityLabel="다음 주"
            hitSlop={8}
            style={styles.navBtn}
          >
            <Text variant="meta" tone="secondary">
              {'\u203A'}
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
    `${cell.weekdayLabel}요일 ${cell.dayOfMonth}일`,
    cell.isToday ? '오늘' : null,
    selected ? '선택됨' : null,
    count > 0 ? `조인 ${count}개` : null,
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
          {cell.isToday ? '오늘' : count > 0 ? String(count) : ' '}
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
