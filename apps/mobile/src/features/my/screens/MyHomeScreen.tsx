import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Badge,
  Button,
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
import { formatCoinAmount, isIdentityVerificationBypassEnabled } from '@jjoin/domain';
import { StoreOwnershipStatus } from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import { isInternalToolsEnabled } from '../../../lib/internal-tools';
import { resolveAppVariant } from '../../../lib/app-variant';
import { getSecureSessionStore, useSession } from '../../../session/SessionContext';
import { isClubsUiEnabled } from '../../clubs/clubs-ui-gate';
import { legalDocumentRoute } from '../../auth/legal';
import { ProfileEditCtaButton } from '../../profile/components/ProfileEditCtaButton';

function showWithdrawTbd() {
  Alert.alert(t('my.withdraw'), '?�원?�퇴 기능?� ?�직 ?�공?��? ?�습?�다.');
}

export function MyHomeScreen() {
  const { me, logout, refreshMe } = useSession();
  const router = useRouter();
  const theme = useTheme();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [hasActiveStores, setHasActiveStores] = useState(false);
  const profile = me?.publicProfile;
  const clubsUiEnabled = isClubsUiEnabled(me?.featureFlags);
  const flags = me?.featureFlags;

  useFocusEffect(
    useCallback(() => {
      void refreshMe().catch(() => undefined);
      void api
        .getMyStores()
        .then((stores) =>
          setHasActiveStores(
            stores.some((store) => store.status === StoreOwnershipStatus.ACTIVE),
          ),
        )
        .catch(() => setHasActiveStores(false));
    }, [api, refreshMe]),
  );

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
<ScrollScreenFrame
      contentPaddingBottom={theme.layoutSpacing.sectionGap + theme.sizes.bottomNav}
    >
      <Text variant="screenTitle" tone="primary">
        {t('my.home.title')}
      </Text>

      <Spacer size="md" />

      <View style={styles.profileHeaderBlock}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/user/${profile.id}`)}
          style={({ pressed }) => [styles.profileHeaderMain, { opacity: pressed ? 0.85 : 1 }]}
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
            {profile.participationTrustLabel ? (
              <Badge label={profile.participationTrustLabel} variant="gold" />
            ) : null}
            {profile.completedJoinCount != null || profile.noShowCount != null ? (
              <Badge
                label={`참석 ${profile.completedJoinCount ?? 0} · ?�쇼 ${profile.noShowCount ?? 0}`}
                variant="neutral"
              />
            ) : null}
            {profile.attendanceRatePercent != null ? (
              <Badge label={`참석�?${profile.attendanceRatePercent}%`} variant="gold" />
            ) : null}
            {profile.reviewCount != null && profile.reviewCount > 0 && profile.averageRatingDisplay ? (
              <Badge
                label={`??${profile.averageRatingDisplay} · ?�기 ${profile.reviewCount}`}
                variant="gold"
              />
            ) : (
              <Badge label="?��? ?�음" variant="neutral" />
            )}
            {profile.verifiedBadge ? (
              <Badge label={t('profile.verified')} variant="success" />
            ) : (
              <Badge label="미인�? variant="warning" />
            )}
          </Row>
        </View>
        <Icon name="chevronRight" tone="tertiary" size="sm" />
        </Pressable>
        <ProfileEditCtaButton onPress={() => router.push('/my/edit-profile')} />
      </View>

      <Spacer size="lg" />

      <Section title={t('wallet.title')} subtitle={t('my.wallet')}>
        <Card variant="elevated" padding="md">
          <Row justify="space-between" align="center">
            <View style={styles.walletStat}>
              <Text variant="meta" tone="secondary">
                {t('wallet.available')}
              </Text>
              <Text variant="coinLarge" style={{ color: theme.colors.reward.primary }}>
                {formatCoinAmount(available)}
              </Text>
            </View>
            <View style={styles.walletStat}>
              <Text variant="meta" tone="secondary">
                {t('wallet.hold')}
              </Text>
              <Text variant="sectionTitle" tone="primary">
                {formatCoinAmount(held)}
              </Text>
            </View>
          </Row>
          <Spacer size="sm" />
          <ListRow
            label={t('my.wallet')}
            icon="wallet"
            onPress={() => router.push('/my/wallet')}
          />
          <ListRow
            label="코인 충전"
            icon="wallet"
            onPress={() => router.push('/my/coin-charge')}
          />
          <ListRow
            label="결제 ?�역"
            icon="calendar"
            onPress={() => router.push('/my/payment-history')}
            showSeparator={false}
          />
        </Card>
      </Section>

      <Section title="?�리미엄 ?�원">
        <Card variant="elevated" padding="md">
          {me?.premiumStatus.active ? (
            <>
              <Row align="center" gap="sm">
                <Badge label="PREMIUM" variant="gold" />
                <Text variant="bodyStrong">?�리미엄 ?�용 �?/Text>
              </Row>
              <Spacer size="xs" />
              <Text variant="meta" tone="secondary">
                {me.premiumStatus.expiresAt
                  ? `${new Date(me.premiumStatus.expiresAt).toLocaleDateString('ko-KR')}까�?`
                  : ''}
              </Text>
            </>
          ) : (
            <>
              <Text variant="body" tone="secondary">
                ???�유�?�� 조인??만들?�보?�요.
              </Text>
            </>
          )}
          <Spacer size="sm" />
          <ListRow
            label={me?.premiumStatus.active ? '?�용기간 ?�장' : '?�리미엄 ?�아보기'}
            icon="verified"
            onPress={() => router.push('/my/premium')}
            showSeparator={false}
          />
        </Card>
      </Section>

      <Section title="매장 ?�영">
        <Card variant="base" padding="none" style={styles.settingsCard}>
          <View style={styles.settingsInner}>
            <ListRow
              label="?�크린골??매장 ?�증"
              icon="verified"
              onPress={() => router.push('/my/store-verification')}
            />
            <ListRow
              label="??매장"
              icon="location"
              onPress={() => router.push('/my/stores')}
              showSeparator={hasActiveStores}
            />
            {hasActiveStores ? (
              <ListRow
                label="모집 조인 만들�?
                icon="calendar"
                onPress={() => router.push('/my/create-store-join')}
                showSeparator={false}
              />
            ) : null}
          </View>
        </Card>
      </Section>

      {clubsUiEnabled ? (
        <Section title="?�호??>
          <Card variant="base" padding="none" style={styles.settingsCard}>
            <View style={styles.settingsInner}>
              <ListRow
                label="?�호??
                subtitle="???�호??· ?�호??찾기"
                icon="people"
                onPress={() => router.push('/my/clubs' as Href)}
                showSeparator={false}
              />
            </View>
          </Card>
        </Section>
      ) : null}

      <Section title="매장 · 보상">
        <Card variant="base" padding="none" style={styles.settingsCard}>
          <View style={styles.settingsInner}>
            <ListRow
              label="?�크�?매장"
              subtitle="공개 매장 ?�러보기"
              icon="golf"
              onPress={() => router.push('/stores' as Href)}
            />
            {flags?.attendanceRewardsEnabled !== false ? (
              <ListRow
                label="출석 · ?�적 보상"
                subtitle="?�늘 출석�??�사 보상"
                icon="coin"
                onPress={() => router.push('/my/rewards' as Href)}
              />
            ) : null}
            {flags?.coinGiftEnabled !== false ? (
              <ListRow
                label="코인 ?�물"
                subtitle="?�른 ?�용?�에�?코인 보내�?
                icon="coin"
                onPress={() => router.push('/my/coin-gift' as Href)}
              />
            ) : null}
            {flags?.profileMatchAlertsEnabled !== false ? (
              <ListRow
                label="?�로??매칭 ?�림"
                subtitle="조건??맞는 ?�스??조인"
                icon="notification"
                onPress={() => router.push('/my/profile-match' as Href)}
                showSeparator={false}
              />
            ) : null}
          </View>
        </Card>
      </Section>

      <Section title="?�동">
        <Card variant="base" padding="none" style={styles.settingsCard}>
          <View style={styles.settingsInner}>
            <ListRow
              label="조인 ?�림"
              icon="notification"
              onPress={() => router.push('/my/join-alerts' as Href)}
            />
            <ListRow
              label="찜한 조인"
              icon="calendar"
              onPress={() => router.push('/my/bookmarks' as Href)}
            />
            <ListRow
              label="?�로?�한 매장"
              icon="location"
              onPress={() => router.push('/my/followed-stores' as Href)}
            />
            <ListRow
              label="골프친구"
              icon="people"
              onPress={() => router.push('/my/golf-friends' as Href)}
            />
            <ListRow
              label="반복 조인"
              icon="calendar"
              onPress={() => router.push('/my/recurring-joins' as Href)}
            />
            <ListRow
              label="?�께 �??�람"
              icon="people"
              onPress={() => router.push('/my/played-together' as Href)}
              showSeparator={false}
            />
          </View>
        </Card>
      </Section>

      <Section title="?�정">
        <Card variant="base" padding="none" style={styles.settingsCard}>
          <View style={styles.settingsInner}>
            <ListRow
              label={t('my.edit')}
              icon="edit"
              onPress={() => router.push('/my/edit-profile')}
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
              subtitle={t('my.notifications.subtitle')}
              icon="notification"
              onPress={() => router.push('/my/notifications')}
            />
            <ListRow
              label={t('my.notificationSettings')}
              subtitle={t('my.notificationSettings.subtitle')}
              icon="notification"
              onPress={() => router.push('/my/notification-settings' as Href)}
            />
            <ListRow
              label={t('my.serviceInfo')}
              onPress={() => router.push('/my/service-info' as Href)}
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

      {isInternalToolsEnabled() ? (
        <Section title="Internal tools" subtitle="APP_VARIANT=development only">
          {isIdentityVerificationBypassEnabled(resolveAppVariant()) ? (
            <Text variant="caption" tone="secondary" style={{ marginBottom: 8 }}>
              DEV: 본인?�증 ?�회 �?
            </Text>
          ) : null}
          <Button
            label="QA: 4??Join ?�세"
            variant="secondary"
            onPress={() => router.push('/dev/qa-four-join' as Href)}
          />
        </Section>
      ) : null}
    </ScrollScreenFrame>
  );
}

const styles = StyleSheet.create({
  profileHeaderBlock: {
    gap: 12,
  },
  profileHeaderMain: {
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
