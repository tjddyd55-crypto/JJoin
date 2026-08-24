import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import {
  Text,
  Button,
  Chip,
  FormScreenFrame,
  StickyActionFrame,
  Stack,
  useTheme,
} from '@jjoin/design-system';
import { computeCoinShortfall, computeRewardEligibleSlots } from '@jjoin/domain';
import { t } from '@jjoin/i18n';
import { JoinMethod, SCREEN_GOLF_CODE, IdentityStatus } from '@jjoin/types';
import { RewardCoinInput } from '../../src/ui/patterns/RewardCoinInput';
import { CoinSummaryCard } from '../../src/ui/patterns/CoinSummaryCard';
import { useJoinCoinPreview } from '../../src/features/create/useJoinCoinPreview';
import { getSecureSessionStore, useSession } from '../../src/session/SessionContext';
import { getApiClient } from '../../src/lib/api';

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

function newIdempotencyKey() {
  return `create-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function CreateScreen() {
  const { requestGatedAction, me } = useSession();
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{
    venueId?: string;
    venueName?: string;
    venueAddress?: string;
  }>();
  const activatedVenueId = typeof params.venueId === 'string' ? params.venueId : undefined;
  const activatedVenueName =
    typeof params.venueName === 'string' ? params.venueName : undefined;
  const activatedVenueAddress =
    typeof params.venueAddress === 'string' ? params.venueAddress : undefined;
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [venueIndex, setVenueIndex] = useState(0);
  const [players, setPlayers] = useState(4);
  const [rewardPerParticipant, setRewardPerParticipant] = useState('0');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneJoinId, setDoneJoinId] = useState<string | null>(null);

  const rewardEligibleSlots = useMemo(() => computeRewardEligibleSlots(players), [players]);
  const previewEnabled = Boolean(me?.userId);
  const {
    preview,
    loading: previewLoading,
    error: previewError,
  } = useJoinCoinPreview(api, players, rewardPerParticipant, previewEnabled);

  const shortfall = useMemo(() => {
    if (!preview) return null;
    return computeCoinShortfall(preview.walletAvailable, preview.totalRequiredCoin);
  }, [preview]);

  const canCreate = preview?.canCreate ?? false;
  const walletAfterDisplay = preview?.walletAfterCreation ?? preview?.walletAvailable ?? '—';
  const identityVerified = me?.identity.verificationStatus === IdentityStatus.VERIFIED;
  // Unverified users must reach the deferred Identity Gate even when coin is short.
  const createDisabled = identityVerified && (!canCreate || previewLoading);
  const createLabel = identityVerified
    ? canCreate
      ? '조인 생성'
      : t('create.coin.insufficientCta')
    : '조인 생성';

  const onCreate = useCallback(async () => {
    const gate = requestGatedAction({ type: 'CREATE_JOIN' });
    if (!gate.allowed) {
      router.push('/auth/gate');
      return;
    }
    if (submitting) return;
    if (!canCreate) {
      setError(
        shortfall
          ? t('create.coin.insufficientAmount').replace('{amount}', shortfall)
          : t('create.coin.insufficient'),
      );
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const fixture = VENUE_FIXTURES[venueIndex];
      const detail = await api.createJoin({
        sportCode: SCREEN_GOLF_CODE,
        ...(activatedVenueId
          ? { venueId: activatedVenueId }
          : { venue: { ...fixture } }),
        startAt: defaultStartAtIso(),
        plannedPlayerCount: players,
        joinMethod: JoinMethod.APPROVAL,
        title: `${activatedVenueName ?? fixture.name} 스크린골프`,
        rewardPerParticipant,
        idempotencyKey: newIdempotencyKey(),
      });
      setDoneJoinId(detail.joinId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'create_failed';
      if (msg.startsWith('network_error')) setError('네트워크 오류 — API 연결을 확인하세요.');
      else if (msg.includes('401')) setError('로그인이 필요합니다.');
      else if (msg.includes('INSUFFICIENT_BALANCE')) setError(t('create.coin.insufficient'));
      else setError('조인 생성에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }, [
    activatedVenueId,
    activatedVenueName,
    api,
    canCreate,
    players,
    requestGatedAction,
    rewardPerParticipant,
    router,
    shortfall,
    submitting,
    venueIndex,
  ]);

  if (doneJoinId) {
    return (
      <FormScreenFrame>
        <Stack gap="md">
          <Text variant="sectionTitle" tone="primary">
            조인 생성 완료
          </Text>
          <Text variant="body" tone="secondary">
            방 생성 수수료와 참가 보상 보류가 Ledger에 기록되었습니다.
          </Text>
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
          <Button label="월렛" variant="secondary" onPress={() => router.push('/my/wallet')} />
        </Stack>
      </FormScreenFrame>
    );
  }

  return (
    <FormScreenFrame
      footer={
        <StickyActionFrame>
          <Button
            disabled={createDisabled}
            label={createLabel}
            loading={submitting}
            onPress={() => void onCreate()}
          />
        </StickyActionFrame>
      }
    >
      <Stack gap="md">
        <Text variant="screenTitle" tone="primary">
          조인 만들기
        </Text>
        <Text variant="caption" tone="secondary">
          {me?.publicProfile?.nickname
            ? `호스트: ${me.publicProfile.nickname}`
            : '로그인한 뒤 생성하세요'}
        </Text>

        <Text variant="sectionTitle" tone="primary">
          장소
        </Text>
        {activatedVenueId ? (
          <View
            style={[
              styles.summary,
              {
                backgroundColor: theme.colors.surface.card,
                borderColor: theme.colors.border.subtle,
                borderRadius: theme.radius.md,
              },
            ]}
          >
            <Text variant="venueTitle" tone="primary">
              {activatedVenueName ?? '선택된 장소'}
            </Text>
            {activatedVenueAddress ? (
              <Text variant="caption" tone="secondary">
                {activatedVenueAddress}
              </Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.row}>
            {VENUE_FIXTURES.map((v, i) => (
              <Chip
                key={v.providerPlaceId}
                label={v.name}
                selected={venueIndex === i}
                onPress={() => setVenueIndex(i)}
              />
            ))}
          </View>
        )}

        <Text variant="sectionTitle" tone="primary">
          모집 인원 {players}명
        </Text>
        <Text variant="caption" tone="secondary">
          {t('create.players.hint')} · 보상 대상 {rewardEligibleSlots}명
        </Text>
        <View style={styles.row}>
          {[2, 3, 4].map((n) => (
            <Chip
              key={n}
              label={`${n}명`}
              selected={players === n}
              onPress={() => setPlayers(n)}
            />
          ))}
        </View>

        <RewardCoinInput
          onChange={setRewardPerParticipant}
          rewardEligibleSlots={rewardEligibleSlots}
          value={rewardPerParticipant}
        />

        <CoinSummaryCard
          roomCreationFee={preview?.roomCreationFee}
          rewardPerParticipant={preview?.rewardPerParticipant}
          rewardEligibleSlots={preview?.rewardEligibleSlots}
          rewardHoldTotal={preview?.rewardHoldTotal}
          totalRequiredCoin={preview?.totalRequiredCoin}
          walletAvailable={preview?.walletAvailable}
          walletAfterCreation={walletAfterDisplay}
          loading={previewLoading && !preview}
          error={previewError}
          shortfall={shortfall}
        />

        {error ? (
          <Text variant="body" tone="error">
            {error}
          </Text>
        ) : null}
      </Stack>
    </FormScreenFrame>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  summary: { gap: 4, padding: 14, borderWidth: 1 },
});
