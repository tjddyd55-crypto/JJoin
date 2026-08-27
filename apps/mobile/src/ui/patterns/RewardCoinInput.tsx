import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  Chip,
  Input,
  Row,
  Text,
  useTheme,
} from '@jjoin/design-system';
import {
  REWARD_QUICK_ADD_DENOMINATIONS,
  addRewardQuickIncrement,
  formatCoinWithLabel,
  formatNumber,
  normalizeRewardPerParticipantInput,
} from '@jjoin/domain';
import { t } from '@jjoin/i18n';

export type RewardCoinInputProps = {
  value: string;
  onChange: (next: string) => void;
  rewardEligibleSlots: number;
  disabled?: boolean;
};

/**
 * Visual pattern for reward-per-participant input.
 * Business state stays in the Create screen; this component only edits the string value.
 */
export function RewardCoinInput({
  value,
  onChange,
  rewardEligibleSlots,
  disabled,
}: RewardCoinInputProps) {
  const theme = useTheme();
  const [draft, setDraft] = useState(value);
  const [flashDelta, setFlashDelta] = useState<number | null>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (flashDelta === null) return;
    const timer = setTimeout(() => setFlashDelta(null), 400);
    return () => clearTimeout(timer);
  }, [flashDelta]);

  const onBlur = useCallback(() => {
    const normalized = normalizeRewardPerParticipantInput(draft);
    setDraft(normalized);
    onChange(normalized);
  }, [draft, onChange]);

  const onQuickAdd = useCallback(
    (delta: number) => {
      const next = addRewardQuickIncrement(value, delta);
      setDraft(next);
      onChange(next);
      setFlashDelta(delta);
    },
    [onChange, value],
  );

  const onReset = useCallback(() => {
    setDraft('0');
    onChange('0');
  }, [onChange]);

  const totalReward = (Number.parseInt(value, 10) || 0) * rewardEligibleSlots;

  return (
    <View style={styles.section}>
      <Text variant="sectionTitle" tone="primary">
        {t('create.reward.title')}
      </Text>
      <Text variant="caption" tone="secondary">
        {t('create.reward.hint')}
      </Text>

      <View style={styles.inputWrap}>
        <Input
          label={t('create.reward.perParticipant')}
          editable={!disabled}
          keyboardType="number-pad"
          onBlur={onBlur}
          onChangeText={(text) => {
            const normalized = normalizeRewardPerParticipantInput(text);
            setDraft(normalized);
            onChange(normalized);
          }}
          placeholder="0"
          rightElement={
            <Text variant="bodyStrong" tone="secondary">
              Coin
            </Text>
          }
          value={draft}
        />
        {flashDelta !== null ? (
          <Text
            variant="caption"
            style={{ color: theme.colors.action.primary, position: 'absolute', right: 8, top: 0 }}
          >
            +{flashDelta}
          </Text>
        ) : null}
      </View>

      <Text variant="caption" tone="secondary">
        {t('create.reward.quickAdd')}
      </Text>
      <Row gap="xs" style={styles.quickRow}>
        {REWARD_QUICK_ADD_DENOMINATIONS.map((delta) => (
          <View key={delta} style={styles.quickItem}>
            <Chip
              label={`+${delta}`}
              variant="quickAdd"
              disabled={disabled}
              onPress={() => onQuickAdd(delta)}
            />
          </View>
        ))}
      </Row>

      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onReset}
        style={styles.reset}
      >
        <Text variant="caption" tone="tertiary">
          {t('create.reward.reset')}
        </Text>
      </Pressable>

      <View
        style={[
          styles.rewardSummary,
          { borderTopColor: theme.colors.border.subtle },
        ]}
      >
        <SummaryRow label={t('create.reward.targetCount')} value={`${formatNumber(rewardEligibleSlots)}명`} />
        <SummaryRow label={t('create.reward.perPerson')} value={formatCoinWithLabel(value)} highlight />
        <SummaryRow label={t('create.reward.total')} value={formatCoinWithLabel(totalReward)} highlight />
      </View>
    </View>
  );
}

function SummaryRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  const theme = useTheme();
  return (
    <Row justify="space-between" align="center">
      <Text variant="body" tone="secondary">
        {label}
      </Text>
      <Text
        variant="bodyStrong"
        style={highlight ? { color: theme.colors.action.primary } : undefined}
      >
        {value}
      </Text>
    </Row>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  inputWrap: { position: 'relative' },
  quickRow: { flexWrap: 'nowrap', alignItems: 'stretch' },
  quickItem: { flex: 1, minWidth: 0 },
  reset: { alignSelf: 'flex-end', paddingVertical: 4 },
  rewardSummary: {
    gap: 8,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
