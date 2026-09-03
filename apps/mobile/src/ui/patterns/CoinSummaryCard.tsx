import { StyleSheet, View } from 'react-native';
import { Card, Divider, Row, Text, useTheme } from '@jjoin/design-system';
import { formatCoinWithLabel, formatNumber } from '@jjoin/domain';
import { t } from '@jjoin/i18n';

export type CoinSummaryCardProps = {
  roomCreationFee?: string;
  rewardPerParticipant?: string;
  rewardEligibleSlots?: number;
  rewardHoldTotal?: string;
  totalRequiredCoin?: string;
  walletAvailable?: string;
  walletAfterCreation?: string;
  loading?: boolean;
  error?: string | null;
  shortfall?: string | null;
  /** Korean role label from server (일반 회원 / 프리미엄 회원 / 업주). */
  creatorUserTypeLabel?: string | null;
  creationCoinEnabled?: boolean;
};

/** Displays server preview numbers only — does not compute coin math. */
export function CoinSummaryCard({
  roomCreationFee,
  rewardPerParticipant,
  rewardEligibleSlots,
  rewardHoldTotal,
  totalRequiredCoin,
  walletAvailable,
  walletAfterCreation,
  loading,
  error,
  shortfall,
  creatorUserTypeLabel,
  creationCoinEnabled,
}: CoinSummaryCardProps) {
  const theme = useTheme();

  if (loading) {
    return (
      <Card variant="elevated" padding="md">
        <Text variant="meta" tone="tertiary">
          코인 preview 계산 중…
        </Text>
      </Card>
    );
  }

  if (error) {
    return (
      <Card variant="elevated" padding="md">
        <Text variant="meta" tone="error">
          코인 preview 실패: {error}
        </Text>
      </Card>
    );
  }

  if (!totalRequiredCoin) {
    return (
      <Card variant="elevated" padding="md">
        <Text variant="meta" tone="tertiary">
          코인 preview를 불러올 수 없습니다.
        </Text>
      </Card>
    );
  }

  const feeValue =
    creationCoinEnabled === false || roomCreationFee === '0'
      ? t('create.coin.feeFree')
      : formatCoinWithLabel(roomCreationFee);

  const roleHint = creatorUserTypeLabel
    ? t('create.coin.roleBasis').replace('{role}', creatorUserTypeLabel)
    : null;

  return (
    <Card variant="elevated" padding="md">
      <Text variant="sectionTitle" tone="primary">
        {t('create.reward.summaryTitle')}
      </Text>
      {roleHint ? (
        <Text variant="meta" tone="tertiary" style={styles.roleHint}>
          {roleHint}
        </Text>
      ) : null}
      <View style={styles.rows}>
        <SummaryRow label={t('create.coin.fee')} value={feeValue} />
        <SummaryRow
          label={t('create.coin.rewardHold')}
          value={`${formatNumber(rewardPerParticipant)} × ${formatNumber(rewardEligibleSlots ?? 0)}`}
          suffix={formatCoinWithLabel(rewardHoldTotal)}
        />
        <Divider />
        <SummaryRow
          highlight
          label={t('create.coin.total')}
          value={formatCoinWithLabel(totalRequiredCoin)}
        />
        <SummaryRow label={t('create.coin.available')} value={formatCoinWithLabel(walletAvailable)} />
        <SummaryRow
          label={t('create.coin.after')}
          value={formatCoinWithLabel(walletAfterCreation ?? walletAvailable)}
        />
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

function SummaryRow({
  label,
  value,
  suffix,
  highlight,
}: {
  label: string;
  value: string;
  suffix?: string;
  highlight?: boolean;
}) {
  const theme = useTheme();
  return (
    <Row justify="space-between" align="flex-start">
      <Text variant="body" tone="secondary">
        {label}
      </Text>
      <View style={styles.valueCol}>
        <Text
          variant="bodyStrong"
          style={highlight ? { color: theme.colors.reward.primary } : undefined}
        >
          {value}
        </Text>
        {suffix ? (
          <Text
            variant="bodyStrong"
            style={highlight ? { color: theme.colors.reward.primary } : undefined}
          >
            {suffix}
          </Text>
        ) : null}
      </View>
    </Row>
  );
}

const styles = StyleSheet.create({
  rows: { gap: 8, marginTop: 12 },
  valueCol: { alignItems: 'flex-end', gap: 2 },
  shortfall: { marginTop: 12 },
  roleHint: { marginTop: 4 },
});
