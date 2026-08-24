import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Button,
  Text,
  IconButton,
  ScrollScreenFrame,
  Section,
  Spacer,
  Row,
  useTheme,
} from '@jjoin/design-system';
import { t } from '@jjoin/i18n';
import { useSession } from '../../src/session/SessionContext';

export default function HomeScreen() {
  const { me } = useSession();
  const router = useRouter();
  const theme = useTheme();
  const nickname = me?.publicProfile?.nickname;
  const available = me?.walletSummary.availableCoin ?? '—';

  return (
    <ScrollScreenFrame>
      <Row justify="space-between" align="center">
        <View style={styles.greeting}>
          <Text variant="meta" tone="tertiary">
            {t('app.name')}
          </Text>
          <Text variant="screenTitle" tone="primary">
            {nickname ? `안녕하세요, ${nickname}님` : t('auth.login.title')}
          </Text>
        </View>
        <IconButton
          icon="notification"
          accessibilityLabel="알림"
          variant="surface"
          onPress={() => router.push('/my/notifications')}
        />
      </Row>

      <Spacer size="md" />

      <Section title="내 코인" subtitle="사용 가능 잔액">
        <View
          style={[
            styles.coinHero,
            {
              backgroundColor: theme.colors.surface.card,
              borderColor: theme.colors.border.subtle,
              borderRadius: theme.radius.lg,
            },
          ]}
        >
          <Text variant="meta" tone="secondary">
            {t('wallet.available')}
          </Text>
          <Text variant="coinLarge" style={{ color: theme.colors.reward.primary }}>
            {available}
          </Text>
        </View>
      </Section>

      <Section title="오늘의 추천 조인" subtitle="근처에서 바로 참여할 수 있는 방">
        <EmptyJoinHint message="아직 추천 조인이 없습니다. 지도에서 장소를 찾아보세요." />
      </Section>

      <Section title="근처 조인" subtitle="주변 스크린골프장">
        <EmptyJoinHint message="근처 열린 조인이 없습니다." />
      </Section>

      <Section title="다가오는 조인">
        <EmptyJoinHint message="예정된 조인이 없습니다." />
        {me?.publicProfile ? (
          <>
            <Spacer size="sm" />
            <Button
              label={t('profile.public.title')}
              variant="secondary"
              onPress={() => router.push(`/user/${me.userId}`)}
            />
          </>
        ) : null}
      </Section>
    </ScrollScreenFrame>
  );
}

function EmptyJoinHint({ message }: { message: string }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.empty,
        {
          backgroundColor: theme.colors.surface.card,
          borderColor: theme.colors.border.subtle,
          borderRadius: theme.radius.lg,
        },
      ]}
    >
      <Text variant="meta" tone="tertiary">
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  greeting: { flex: 1, gap: 4, paddingRight: 12 },
  coinHero: {
    padding: 16,
    borderWidth: 1,
    gap: 4,
  },
  empty: {
    padding: 16,
    borderWidth: 1,
    minHeight: 72,
    justifyContent: 'center',
  },
});
