import { StyleSheet, View } from 'react-native';
import { Icon } from '../../icons/Icon';
import { Text } from '../../primitives/Text';
import { useTheme } from '../../theme';

export type JoinScheduleSummaryProps = {
  dateLabel: string;
  startLabel: string;
  endLabel?: string | null;
};

export function JoinScheduleSummary({ dateLabel, startLabel, endLabel }: JoinScheduleSummaryProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.join.surface.info,
          borderRadius: theme.radius.md,
        },
      ]}
    >
      <View style={styles.tile}>
        <Icon name="calendar" size="sm" tone="tertiary" />
        <View style={styles.tileText}>
          <Text variant="caption" tone="secondary">날짜</Text>
          <Text variant="bodyStrong" tone="primary">{dateLabel}</Text>
        </View>
      </View>
      <View style={styles.divider} />
      <View style={styles.tile}>
        <Icon name="clock" size="sm" tone="tertiary" />
        <View style={styles.tileText}>
          <Text variant="caption" tone="secondary">시작</Text>
          <Text variant="bodyStrong" tone="primary">{startLabel}</Text>
        </View>
      </View>
      {endLabel ? (
        <>
          <View style={styles.divider} />
          <View style={styles.tile}>
            <Icon name="clock" size="sm" tone="tertiary" />
            <View style={styles.tileText}>
              <Text variant="caption" tone="secondary">예상 종료</Text>
              <Text variant="bodyStrong" tone="primary">{endLabel}</Text>
            </View>
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  tile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    minWidth: 0,
  },
  tileText: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
});
