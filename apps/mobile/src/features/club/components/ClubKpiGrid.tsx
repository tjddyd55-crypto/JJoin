import { StyleSheet, View } from 'react-native';
import { Text, spacing } from '@jjoin/design-system';
import { formatAttendanceRateDisplay } from '@jjoin/domain';
import type { ClubDashboardDto } from '@jjoin/types';

type Props = {
  dashboard: ClubDashboardDto;
};

export function ClubKpiGrid({ dashboard }: Props) {
  const items = [
    { label: '회원', value: `${dashboard.memberCount}명` },
    { label: '올해 모임', value: `${dashboard.eventsThisYear}회` },
    { label: '누적 참석', value: `${dashboard.totalAttended}회` },
    {
      label: '평균 참석률',
      value: formatAttendanceRateDisplay(dashboard.averageAttendanceRate),
    },
  ];

  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <View key={item.label} style={styles.cell}>
          <Text variant="caption" tone="secondary">
            {item.label}
          </Text>
          <Text variant="bodyStrong">{item.value}</Text>
        </View>
      ))}
    </View>
  );
}

export function ClubRecent30Row({ dashboard }: Props) {
  return (
    <Text variant="caption" tone="tertiary">
      최근 30일 · 모임 {dashboard.recent30DayEvents}회 · 평균 참석률{' '}
      {formatAttendanceRateDisplay(dashboard.recent30DayAttendanceRate)}
    </Text>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  cell: {
    width: '47%',
    gap: spacing.xxs,
    padding: spacing.sm,
    borderRadius: 12,
  },
});
