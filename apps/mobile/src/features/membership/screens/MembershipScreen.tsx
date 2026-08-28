import { useRouter } from 'expo-router';
import { Button, Card, ScrollScreenFrame, Section, Spacer, Text, useTheme } from '@jjoin/design-system';
import { t } from '@jjoin/i18n';
import { useMembership } from '../useMembership';
import { MembershipSummaryCard } from '../../../ui/patterns/MembershipSummaryCard';
import { MembershipBenefitRow } from '../../../ui/patterns/MembershipBenefitRow';

export function MembershipScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { state, membership, presentation, error, refresh } = useMembership();

  if (state === 'bootstrapping' || state === 'loading') {
    return (
      <ScrollScreenFrame>
        <Text variant="screenTitle" tone="primary">
          {t('membership.title')}
        </Text>
        <Spacer size="md" />
        <Text variant="body" tone="secondary">
          {t('common.loading')}
        </Text>
      </ScrollScreenFrame>
    );
  }

  if (state === 'error' || !presentation || !membership) {
    return (
      <ScrollScreenFrame>
        <Text variant="screenTitle" tone="primary">
          {t('membership.title')}
        </Text>
        <Spacer size="md" />
        <Text variant="body" tone="error">
          {error ?? t('common.error')}
        </Text>
        <Spacer size="md" />
        <Button label={t('common.retry')} onPress={() => void refresh()} />
      </ScrollScreenFrame>
    );
  }

  const isPremium = membership.effectivePlan === 'PREMIUM';

  return (
    <ScrollScreenFrame contentPaddingBottom={theme.layoutSpacing.sectionGap * 2}>
      <Text variant="screenTitle" tone="primary">
        {t('membership.title')}
      </Text>
      <Spacer size="md" />

      <MembershipSummaryCard presentation={presentation} />

      <Spacer size="lg" />

      <Section title={t('membership.benefitsTitle')}>
        <Card variant="base" padding="md">
          <MembershipBenefitRow
            label={t('membership.benefit.feeWaiver')}
            description={
              isPremium && membership.hasRoomCreationFeeWaiver
                ? t('membership.benefit.active')
                : t('membership.benefit.premiumOnly')
            }
          />
          <Spacer size="sm" />
          <Text variant="caption" tone="secondary">
            {t('membership.copy.feeWaiver')}
          </Text>
          <Spacer size="sm" />
          <Text variant="caption" tone="secondary">
            {t('membership.copy.rewardStillRequired')}
          </Text>
        </Card>
      </Section>

      {!isPremium ? (
        <>
          <Spacer size="lg" />
          <Card variant="elevated" padding="md">
            <Text variant="body" tone="secondary">
              {t('membership.free.intro')}
            </Text>
          </Card>
        </>
      ) : null}

      {isPremium && presentation.cancelNotice ? (
        <>
          <Spacer size="md" />
          <Card variant="base" padding="md">
            <Text variant="body" tone="warning">
              {presentation.cancelNotice}
            </Text>
          </Card>
        </>
      ) : null}

      <Spacer size="lg" />
      <Button label={t('common.confirm')} variant="secondary" onPress={() => router.back()} />
    </ScrollScreenFrame>
  );
}
