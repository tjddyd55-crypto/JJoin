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
import { formatNumber } from '@jjoin/domain';
import { StoreOwnershipStatus } from '@jjoin/types';
import { getApiClient } from '../../../lib/api';
import { isInternalToolsEnabled } from '../../../lib/internal-tools';
import { getSecureSessionStore, useSession } from '../../../session/SessionContext';
import { legalDocumentRoute } from '../../auth/legal';

function showWithdrawTbd() {
  Alert.alert(t('my.withdraw'), '회원탈퇴 기능은 아직 제공되지 않습니다.');
}

export function MyHomeScreen() {
  const { me, logout } = useSession();
  const router = useRouter();
  const theme = useTheme();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [hasActiveStores, setHasActiveStores] = useState(false);
  const profile = me?.publicProfile;

  useFocusEffect(
    useCallback(() => {
      void api
        .getMyStores()
        .then((stores) =>
          setHasActiveStores(
            stores.some((store) => store.status === StoreOwnershipStatus.ACTIVE),
          ),
        )
        .catch(() => setHasActiveStores(false));
    }, [api]),
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
            {profile.completedJoinCount != null || profile.noShowCount != null ? (
              <Badge
                label={`참석 ${profile.completedJoinCount ?? 0} · 노쇼 ${profile.noShowCount ?? 0}`}
                variant="neutral"
              />
            ) : null}
            {profile.attendanceRatePercent != null ? (
              <Badge label={`참석률 ${profile.attendanceRatePercent}%`} variant="gold" />
            ) : null}
            {profile.verifiedBadge ? (
              <Badge label={t('profile.verified')} variant="success" />
            ) : (
              <Badge label="미인증" variant="warning" />
            )}
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
                {formatNumber(available)}
              </Text>
            </View>
            <View style={styles.walletStat}>
              <Text variant="meta" tone="secondary">
                {t('wallet.hold')}
              </Text>
              <Text variant="sectionTitle" tone="primary">
                {formatNumber(held)}
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

      <Section title="매장 운영">
        <Card variant="base" padding="none" style={styles.settingsCard}>
          <View style={styles.settingsInner}>
            <ListRow
              label="스크린골프 매장 인증"
              icon="verified"
              onPress={() => router.push('/my/store-verification')}
            />
            <ListRow
              label="내 매장"
              icon="location"
              onPress={() => router.push('/my/stores')}
              showSeparator={hasActiveStores}
            />
            {hasActiveStores ? (
              <ListRow
                label="모집 조인 만들기"
                icon="calendar"
                onPress={() => router.push('/my/create-store-join')}
                showSeparator={false}
              />
            ) : null}
          </View>
        </Card>
      </Section>

      <Section title="동호회">
        <Card variant="base" padding="none" style={styles.settingsCard}>
          <View style={styles.settingsInner}>
            <ListRow
              label="동호회"
              subtitle="내 동호회 · 동호회 찾기"
              icon="people"
              onPress={() => router.push('/my/clubs' as Href)}
              showSeparator={false}
            />
          </View>
        </Card>
      </Section>

      <Section title="활동">
        <Card variant="base" padding="none" style={styles.settingsCard}>
          <View style={styles.settingsInner}>
            <ListRow
              label="조인 알림"
              icon="notification"
              onPress={() => router.push('/my/join-alerts' as Href)}
            />
            <ListRow
              label="찜한 조인"
              icon="calendar"
              onPress={() => router.push('/my/bookmarks' as Href)}
            />
            <ListRow
              label="팔로우한 매장"
              icon="location"
              onPress={() => router.push('/my/followed-stores' as Href)}
            />
            <ListRow
              label="함께 친 사람"
              icon="people"
              onPress={() => router.push('/my/played-together' as Href)}
              showSeparator={false}
            />
          </View>
        </Card>
      </Section>

      <Section title="설정">
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
          <Button
            label="QA: 4인 Join 상세"
            variant="secondary"
            onPress={() => router.push('/dev/qa-four-join' as Href)}
          />
        </Section>
      ) : null}
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
