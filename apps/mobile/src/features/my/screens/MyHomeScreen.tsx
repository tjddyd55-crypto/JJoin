import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Badge,
  Card,
  Icon,
  ListRow,
  Row,
  ScrollScreenFrame,
  Section,
  Spacer,
  Text,
  UserAvatar,
  useTheme,
} from '@jjoin/design-system';
import { t } from '@jjoin/i18n';
import { useSession } from '../../../session/SessionContext';
import { useMembership } from '../../membership/useMembership';
import { MembershipBadge } from '../../../ui/patterns/MembershipBadge';
import { MembershipSummaryCard } from '../../../ui/patterns/MembershipSummaryCard';
import { legalDocumentRoute } from '../../auth/legal';

function showWithdrawTbd() {
  Alert.alert(t('my.withdraw'), '회원탈퇴 기능은 아직 제공되지 않습니다.');
}

export function MyHomeScreen() {
  const { me, logout } = useSession();
  const { state: membershipState, presentation } = useMembership();
  const router = useRouter();
  const theme = useTheme();
  const profile = me?.publicProfile;

  if (!profile) {
    return (
      <ScrollScreenFrame>
        <Text variant="body" tone="secondary">
          {t('common.empty')}
        </Text>
      </ScrollScreenFrame>
    );
  }

  const available = me?.walletSummary.availableCoin ?? '0';
  const held = me?.walletSummary.heldCoin ?? '0';

  const handleLogout = () => {
    void logout().then(() => router.replace('/auth/login'));
  };

  return (
    <ScrollScreenFrame contentPaddingBottom={theme.layoutSpacing.sectionGap * 2}>
      <Text variant="screenTitle" tone="primary">
        {t('my.home.title')}
      </Text>

      <Spacer size="md" />

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push(`/user/${profile.id}`)}
        style={({ pressed }) => [styles.profileHeader, { opacity: pressed ? 0.85 : 1 }]}
      >
        <UserAvatar uri={profile.avatarUrl} name={profile.nickname} size="lg" />
        <View style={styles.profileMeta}>
          <Row align="center" gap="sm">
            <Text variant="sectionTitle" tone="primary">
              {profile.nickname}
            </Text>
            {profile.verifiedBadge ? (
              <Icon name="verified" tone="gold" size="sm" accessibilityLabel={t('profile.verified')} />
            ) : null}
          </Row>
          {profile.regionLabel ? (
            <Text variant="meta" tone="secondary">
              {profile.regionLabel}
            </Text>
          ) : null}
          <Row gap="sm" style={styles.statsRow}>
            <Badge label={`${t('profile.participationCount')} ${profile.participationCount}`} variant="neutral" />
            {profile.verifiedBadge ? (
              <Badge label={t('profile.verified')} variant="success" />
            ) : (
              <Badge label="미인증" variant="warning" />
            )}
            {membershipState === 'ready' && presentation ? (
              <MembershipBadge presentation={presentation} />
            ) : null}
          </Row>
        </View>
        <Icon name="chevronRight" tone="tertiary" size="sm" />
      </Pressable>

      <Spacer size="lg" />

      <Section title={t('wallet.title')} subtitle={t('my.wallet')}>
        <Card variant="elevated" padding="md">
          <Row justify="space-between" align="center">
            <View style={styles.walletStat}>
              <Text variant="meta" tone="secondary">
                {t('wallet.available')}
              </Text>
              <Text variant="coinLarge" style={{ color: theme.colors.reward.primary }}>
                {available}
              </Text>
            </View>
            <View style={styles.walletStat}>
              <Text variant="meta" tone="secondary">
                {t('wallet.hold')}
              </Text>
              <Text variant="sectionTitle" tone="primary">
                {held}
              </Text>
            </View>
          </Row>
          <Spacer size="sm" />
          <ListRow
            label={t('my.wallet')}
            icon="wallet"
            onPress={() => router.push('/my/wallet')}
            showSeparator={false}
          />
        </Card>
      </Section>

      <Spacer size="lg" />

      {membershipState === 'ready' && presentation ? (
        <Section title={t('my.membership')}>
          <MembershipSummaryCard presentation={presentation} />
          <Spacer size="sm" />
        </Section>
      ) : null}

      <Section title="설정">
        <Card variant="base" padding="none" style={styles.settingsCard}>
          <View style={styles.settingsInner}>
            <ListRow
              label={t('my.edit')}
              icon="edit"
              onPress={() => router.push('/my/edit-profile')}
            />
            <ListRow
              label={t('my.membership')}
              icon="verified"
              subtitle={
                membershipState === 'ready' && presentation
                  ? presentation.settingsSubtitle
                  : membershipState === 'loading' || membershipState === 'bootstrapping'
                    ? t('common.loading')
                    : undefined
              }
              onPress={() => router.push('/my/membership')}
            />
            <ListRow
              label={t('my.hosted')}
              icon="calendar"
              onPress={() =>
                router.push({ pathname: '/(tabs)/my-joins', params: { section: 'hosted' } })
              }
            />
            <ListRow
              label={t('my.joined')}
              icon="people"
              onPress={() =>
                router.push({ pathname: '/(tabs)/my-joins', params: { section: 'participating' } })
              }
            />
            <ListRow
              label={t('my.account')}
              icon="profile"
              onPress={() => router.push('/my/account')}
            />
            <ListRow
              label={t('my.notifications')}
              icon="notification"
              onPress={() => router.push('/my/notifications')}
            />
            <ListRow label={t('my.terms')} onPress={() => router.push(legalDocumentRoute('tos'))} />
            <ListRow
              label={t('my.privacy')}
              onPress={() => router.push(legalDocumentRoute('privacy'))}
            />
            <ListRow label={t('my.logout')} tone="default" onPress={handleLogout} showSeparator />
            <ListRow
              label={t('my.withdraw')}
              tone="danger"
              onPress={showWithdrawTbd}
              showSeparator={false}
            />
          </View>
        </Card>
      </Section>
    </ScrollScreenFrame>
  );
}

const styles = StyleSheet.create({
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  profileMeta: {
    flex: 1,
    gap: 4,
  },
  statsRow: {
    flexWrap: 'wrap',
    marginTop: 4,
  },
  walletStat: {
    gap: 4,
    flex: 1,
  },
  settingsCard: {
    overflow: 'hidden',
  },
  settingsInner: {
    paddingHorizontal: 16,
  },
});
