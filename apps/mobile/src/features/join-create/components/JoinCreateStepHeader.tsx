import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from '@jjoin/design-system';
import type { JoinCreateStepId } from '../model/join-create-steps';
import { JOIN_CREATE_STEPS, joinCreateStepIndex } from '../model/join-create-steps';

export type JoinCreateStepHeaderProps = {
  current: JoinCreateStepId;
  onSelect?: (step: JoinCreateStepId) => void;
};

export function JoinCreateStepHeader({ current, onSelect }: JoinCreateStepHeaderProps) {
  const theme = useTheme();
  const currentIndex = joinCreateStepIndex(current);

  return (
    <View style={styles.root}>
      {JOIN_CREATE_STEPS.map((step, index) => {
        const done = index < currentIndex;
        const active = step.id === current;
        const canJump = onSelect && index <= currentIndex;
        return (
          <Pressable
            key={step.id}
            accessibilityRole="button"
            disabled={!canJump}
            onPress={() => onSelect?.(step.id)}
            style={styles.stepHit}
          >
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: done || active
                    ? theme.colors.action.primary
                    : theme.colors.border.subtle,
                },
              ]}
            >
              {done ? (
                <Text variant="caption" tone="inverse" style={styles.checkMark}>✓</Text>
              ) : null}
            </View>
            <Text
              variant="caption"
              tone={active ? 'primary' : 'secondary'}
              style={active ? styles.activeLabel : undefined}
              numberOfLines={1}
            >
              {step.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export type JoinCreateSummaryRowProps = {
  label: string;
  value: string;
  onPress?: () => void;
  done?: boolean;
};

export function JoinCreateSummaryRow({
  label,
  value,
  onPress,
  done = true,
}: JoinCreateSummaryRowProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      disabled={!onPress}
      onPress={onPress}
      style={styles.summaryRow}
    >
      <Text variant="meta" tone="secondary" style={styles.summaryLabel}>
        {done ? '✓ ' : ''}{label}
      </Text>
      <Text variant="bodyStrong" tone="primary" numberOfLines={2} style={styles.summaryValue}>
        {value}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  stepHit: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    justifyContent: 'center',
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeLabel: {
    fontWeight: '700',
  },
  checkMark: {
    fontSize: 12,
    fontWeight: '700',
  },
  summaryRow: {
    gap: 4,
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    lineHeight: 18,
  },
  summaryValue: {
    fontSize: 15,
    lineHeight: 22,
  },
});
