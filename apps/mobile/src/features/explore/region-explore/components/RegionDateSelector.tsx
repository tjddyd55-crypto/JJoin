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
            <Text
              variant="meta"
              tone={selected ? 'success' : cell.isToday ? undefined : 'tertiary'}
              style={[
                styles.weekday,
                cell.isToday && !selected
                  ? { color: theme.colors.state.active }
                  : undefined,
                isWeekend && !selected && !cell.isToday
                  ? { color: theme.colors.text.secondary }
                  : undefined,
              ]}
            >
              {cell.isToday ? '오늘' : cell.weekdayLabel}
            </Text>
            <View
              style={[
                styles.dayNum,
                selected
                  ? {
                      backgroundColor: theme.colors.state.selectedSurface,
                      borderRadius: theme.radius.md,
                    }
                  : null,
              ]}
            >
              <Text
                variant="meta"
                tone={selected ? 'success' : 'primary'}
                style={[styles.dayNumText, selected ? { fontWeight: '700' } : undefined]}
              >
                {cell.dayOfMonth}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  day: {
    alignItems: 'center',
    gap: 2,
    minWidth: 40,
    paddingVertical: 2,
  },
  weekday: {
    fontSize: 11,
    lineHeight: 14,
  },
  dayNum: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumText: {
    fontSize: 15,
    lineHeight: 18,
  },
});
