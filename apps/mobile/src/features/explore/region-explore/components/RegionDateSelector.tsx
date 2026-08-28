import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, spacing, useTheme } from '@jjoin/design-system';
import { buildRegionDateStrip, localDayKey } from '@jjoin/domain';

const STRIP_DAYS = 14;

type Props = {
  selectedDate: string;
  onSelectDate: (date: string) => void;
};

export function RegionDateSelector({ selectedDate, onSelectDate }: Props) {
  const theme = useTheme();
  const gold = theme.colors.action.primary;
  const todayKey = useMemo(() => localDayKey(new Date()), []);
  const cells = useMemo(
    () => buildRegionDateStrip(todayKey, STRIP_DAYS),
    [todayKey],
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.strip}
    >
      {cells.map((cell) => {
        const selected = cell.date === selectedDate;
        const isWeekend = cell.weekdayIndex === 0 || cell.weekdayIndex === 6;
        return (
          <Pressable
            key={cell.date}
            onPress={() => onSelectDate(cell.date)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${cell.isToday ? '오늘 ' : ''}${cell.dayOfMonth}일 ${cell.weekdayLabel}요일`}
            style={styles.day}
          >
            {cell.isToday ? (
              <Text variant="meta" style={{ color: gold, fontSize: 10 }}>
                오늘
              </Text>
            ) : (
              <Text
                variant="meta"
                tone="tertiary"
                style={isWeekend ? { color: theme.colors.text.secondary } : undefined}
              >
                {cell.weekdayLabel}
              </Text>
            )}
            <View
              style={[
                styles.dayNum,
                selected
                  ? { backgroundColor: gold, borderRadius: theme.radius.md }
                  : null,
              ]}
            >
              <Text
                variant="body"
                tone="primary"
                style={selected ? { color: theme.colors.text.onGold } : undefined}
              >
                {cell.dayOfMonth}
              </Text>
            </View>
            <Text variant="meta" tone="tertiary" style={{ fontSize: 10 }}>
              {Number(cell.date.slice(5, 7))}/{cell.dayOfMonth}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  day: {
    alignItems: 'center',
    gap: 2,
    minWidth: 44,
    paddingVertical: spacing.xs,
  },
  dayNum: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
