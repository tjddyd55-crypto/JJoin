import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Badge, Card, Divider, Row, Text, useTheme } from '@jjoin/design-system';
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
  /** Server SSOT — do not invent client-side. */
  roomCreationFeeWaived?: boolean;
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
  roomCreationFeeWaived,
}: CoinSummaryCardProps) {
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

  const showPremiumFeeLabel = Boolean(roomCreationFeeWaived);

  return (
    <Card variant="elevated" padding="md">
      <Text variant="sectionTitle" tone="primary">
        {t('create.reward.summaryTitle')}
      </Text>
      <View style={styles.rows}>
        <SummaryRow
          label={t('create.coin.fee')}
          value={`${roomCreationFee} Coin`}
          badge={
            showPremiumFeeLabel ? (
              <Badge label={t('membership.create.premiumBenefit')} variant="gold" />
            ) : undefined
          }
        />
        <SummaryRow
          label={t('create.coin.reward')}
          value={`${rewardPerParticipant} × ${rewardEligibleSlots}`}
          suffix={`${rewardHoldTotal} Coin`}
        />
        <Divider />
        <SummaryRow
          highlight
          label={t('create.coin.total')}
          value={`${totalRequiredCoin} Coin`}
        />
        <SummaryRow label={t('create.coin.available')} value={`${walletAvailable} Coin`} />
        <SummaryRow
          label={t('create.coin.after')}
          value={`${walletAfterCreation ?? walletAvailable} Coin`}
        />
      </View>
      {shortfall ? (
        <Text variant="body" tone="error" style={styles.shortfall}>
          {t('create.coin.insufficientAmount').replace('{amount}', shortfall)}
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
  badge,
}: {
  label: string;
  value: string;
  suffix?: string;
  highlight?: boolean;
  badge?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <Row justify="space-between" align="flex-start">
      <View style={styles.labelCol}>
        <Text variant="body" tone="secondary">
          {label}
        </Text>
        {badge ? <View style={styles.badgeWrap}>{badge}</View> : null}
      </View>
      <View style={styles.valueCol}>
        <Text
          variant="bodyStrong"
          style={highlight ? { color: theme.colors.action.primary } : undefined}
        >
          {value}
        </Text>
        {suffix ? (
          <Text
            variant="bodyStrong"
            style={highlight ? { color: theme.colors.action.primary } : undefined}
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
  labelCol: { flex: 1, gap: 4, paddingRight: 8 },
  badgeWrap: { alignSelf: 'flex-start' },
  valueCol: { alignItems: 'flex-end', gap: 2 },
  shortfall: { marginTop: 12 },
});
