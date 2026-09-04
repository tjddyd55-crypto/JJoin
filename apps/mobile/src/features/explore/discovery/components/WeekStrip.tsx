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
  onPrevWeek: _onPrevWeek,
  onNextWeek: _onNextWeek,
  compact = false,
}: Props) {
  const theme = useTheme();
  const cells = useMemo(() => buildWeekStrip(weekAnchorDate), [weekAnchorDate]);

  const stripContent = (
    <View style={styles.strip}>
      {cells.map((cell) => (
        <DayCell
          key={cell.date}
          cell={cell}
          selected={cell.date === selectedDate}
          count={dayCounts?.[cell.date] ?? 0}
          compact={compact}
          onPress={() => onSelectDate(cell.date)}
        />
      ))}
    </View>
  );

  if (compact) {
    return <View style={styles.wrapCompact}>{stripContent}</View>;
  }

  return (
    <View style={styles.outer}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface.card,
            borderColor: theme.colors.border.subtle,
          },
        ]}
      >
        {stripContent}
      </View>
    </View>
  );
}

function weekendTextColor(
  weekdayIndex: number,
  theme: ReturnType<typeof useTheme>,
): string | undefined {
  if (weekdayIndex === 0) return theme.colors.status.error;
  if (weekdayIndex === 6) return theme.colors.status.info;
  return undefined;
}

function DayCell({
  cell,
  selected,
  count,
  compact,
  onPress,
}: {
  cell: WeekDayCell;
  selected: boolean;
  count: number;
  compact: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const weekendColor = weekendTextColor(cell.weekdayIndex, theme);
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
        variant="joinFilterChip"
        tone={selected ? 'primary' : 'tertiary'}
        style={!selected && weekendColor ? { color: weekendColor } : undefined}
      >
        {cell.weekdayLabel}
      </Text>
      <View
        style={[
          compact ? styles.dayNumCompact : styles.dayNum,
          selected
            ? {
                backgroundColor: theme.colors.join.surface.info,
                borderRadius: 12,
              }
            : null,
        ]}
      >
        <Text
          variant="joinTabLabel"
          tone={selected ? 'primary' : 'secondary'}
          style={!selected && weekendColor ? { color: weekendColor } : undefined}
        >
          {cell.dayOfMonth}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  card: {
    minHeight: 68,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  wrapCompact: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  strip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  day: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
  },
  dayNum: {
    width: 38,
    height: 50,
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
