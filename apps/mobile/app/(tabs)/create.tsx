import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import {
  AppText,
  BottomActionBar,
  Button,
  ScreenContainer,
  Stack,
  colors,
  spacing,
} from '@jjoin/design-system';
import { JoinMethod, SCREEN_GOLF_CODE } from '@jjoin/types';
import { useSession } from '../../src/session/SessionContext';
import { getApiClient } from '../../src/lib/api';
import { getSecureSessionStore } from '../../src/session/SessionContext';

const VENUE_FIXTURES = [
  {
    provider: 'MOCK',
    providerPlaceId: 'venue_sg_geoje',
    name: 'SG골프 거제점',
    address: '거제시 고현동',
    regionLabel: '거제시 고현동',
    latitude: 34.8805,
    longitude: 128.6211,
  },
  {
    provider: 'MOCK',
    providerPlaceId: 'venue_golfzon_gohyeon',
    name: '골프존 고현점',
    address: '거제시 고현동',
    regionLabel: '거제시 고현동',
    latitude: 34.8785,
    longitude: 128.6301,
  },
] as const;

function defaultStartAtIso() {
  const d = new Date(Date.now() + 2 * 60 * 60_000);
  d.setMinutes(0, 0, 0);
  return d.toISOString();
}

export default function CreateScreen() {
  const { requestGatedAction, me } = useSession();
  const router = useRouter();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [venueIndex, setVenueIndex] = useState(0);
  const [players, setPlayers] = useState(4);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneJoinId, setDoneJoinId] = useState<string | null>(null);

  const onCreate = useCallback(async () => {
    const gate = requestGatedAction({ type: 'CREATE_JOIN' });
    if (!gate.allowed) {
      router.push('/auth/gate');
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const venue = VENUE_FIXTURES[venueIndex];
      const detail = await api.createJoin({
        sportCode: SCREEN_GOLF_CODE,
        venue: { ...venue },
        startAt: defaultStartAtIso(),
        plannedPlayerCount: players,
        joinMethod: JoinMethod.APPROVAL,
        title: `${venue.name} 스크린골프`,
        rewardPerParticipant: '0',
      });
      setDoneJoinId(detail.joinId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'create_failed';
      if (msg.startsWith('network_error')) setError('네트워크 오류 — API 연결을 확인하세요.');
      else if (msg.includes('401')) setError('로그인이 필요합니다.');
      else setError('조인 생성에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }, [api, players, requestGatedAction, router, submitting, venueIndex]);

  if (doneJoinId) {
    return (
      <ScreenContainer>
        <Stack gap="md" style={styles.body}>
          <AppText variant="subtitle">조인 생성 완료</AppText>
          <AppText variant="body" color="textSecondary">
            PostgreSQL에 저장되었습니다. Explore에서 확인할 수 있습니다.
          </AppText>
          <Button
            label="조인 상세"
            onPress={() =>
              router.push({ pathname: '/join/[joinId]', params: { joinId: doneJoinId } } as Href)
            }
          />
          <Button
            label="내 조인"
            variant="secondary"
            onPress={() => router.push('/(tabs)/my-joins')}
          />
        </Stack>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Stack gap="md" style={styles.body}>
        <AppText variant="subtitle">조인 만들기</AppText>
        <AppText variant="caption" color="textSecondary">
          {me?.publicProfile?.nickname
            ? `호스트: ${me.publicProfile.nickname}`
            : 'DEV_A로 로그인한 뒤 생성하세요'}
        </AppText>

        <AppText variant="body">장소</AppText>
        <View style={styles.row}>
          {VENUE_FIXTURES.map((v, i) => (
            <Pressable
              key={v.providerPlaceId}
              onPress={() => setVenueIndex(i)}
              style={[styles.chip, venueIndex === i && styles.chipOn]}
            >
              <AppText variant="caption">{v.name}</AppText>
            </Pressable>
          ))}
        </View>

        <AppText variant="body">인원 {players}명</AppText>
        <View style={styles.row}>
          {[2, 3, 4].map((n) => (
            <Pressable
              key={n}
              onPress={() => setPlayers(n)}
              style={[styles.chip, players === n && styles.chipOn]}
            >
              <AppText variant="caption">{n}명</AppText>
            </Pressable>
          ))}
        </View>

        <AppText variant="caption" color="textSecondary">
          참가 방식: 승인제 · 보상 스냅샷만 저장 (Coin 정산 보류)
        </AppText>

        {error ? (
          <AppText variant="body" color="danger">
            {error}
          </AppText>
        ) : null}
      </Stack>

      <BottomActionBar>
        <Button label="조인 생성" loading={submitting} onPress={() => void onCreate()} />
      </BottomActionBar>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  body: { paddingBottom: spacing.lg },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chipOn: { borderColor: colors.primary, backgroundColor: colors.surface },
});
