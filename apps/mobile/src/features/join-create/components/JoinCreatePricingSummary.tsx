import { StyleSheet, View } from 'react-native';
import { Card, Text, useTheme } from '@jjoin/design-system';
import { formatCoinWithLabel, formatNumber } from '@jjoin/domain';
import { t } from '@jjoin/i18n';

export type JoinCreatePricingSummaryProps = {
  roomCreationFee?: string;
  rewardPerParticipant?: string;
  rewardEligibleSlots?: number;
  totalRequiredCoin?: string;
  walletAvailable?: string;
  loading?: boolean;
  error?: string | null;
  shortfall?: string | null;
  creatorUserTypeLabel?: string | null;
  creationCoinEnabled?: boolean;
};

/** Compact creation pricing — no HOLD / ledger explanations. */
export function JoinCreatePricingSummary({
  roomCreationFee,
  rewardPerParticipant,
  rewardEligibleSlots,
  totalRequiredCoin,
  walletAvailable,
  loading,
  error,
  shortfall,
  creatorUserTypeLabel,
  creationCoinEnabled,
}: JoinCreatePricingSummaryProps) {
  const theme = useTheme();

  if (loading) {
    return (
      <Card variant="elevated" padding="md">
        <Text variant="meta" tone="tertiary">생성비 확인 중…</Text>
      </Card>
    );
  }

  if (error) {
    return (
      <Card variant="elevated" padding="md">
        <Text variant="meta" tone="error">생성비를 불러올 수 없습니다.</Text>
      </Card>
    );
  }

  if (!totalRequiredCoin) return null;

  const feeValue =
    creationCoinEnabled === false || roomCreationFee === '0'
      ? '생성비 무료'
      : `생성비 ${formatCoinWithLabel(roomCreationFee)}`;

  const rewardValue =
    rewardPerParticipant && Number(rewardPerParticipant) > 0
      ? `참가보상 ${formatNumber(rewardPerParticipant)} × ${formatNumber(rewardEligibleSlots ?? 0)}`
      : null;

  return (
    <Card variant="elevated" padding="md">
      <View style={styles.rows}>
        <Text variant="bodyStrong" tone="primary">{feeValue}</Text>
        {rewardValue ? (
          <Text variant="meta" tone="secondary">{rewardValue}</Text>
        ) : null}
        {creatorUserTypeLabel ? (
          <Text variant="caption" tone="tertiary">
            {t('create.coin.roleBasis').replace('{role}', creatorUserTypeLabel)}
          </Text>
        ) : null}
        <Text variant="meta" tone="secondary">
          필요 {formatCoinWithLabel(totalRequiredCoin)} · 보유 {formatCoinWithLabel(walletAvailable)}
        </Text>
      </View>
      {shortfall ? (
        <Text variant="body" tone="error" style={styles.shortfall}>
          {t('create.coin.insufficientDetail')
            .replace('{available}', formatNumber(walletAvailable))
            .replace('{required}', formatNumber(totalRequiredCoin))
            .replace('{shortfall}', formatNumber(shortfall))}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  rows: { gap: 6 },
  shortfall: { marginTop: 8 },
});
