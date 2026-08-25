import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import {
  Text,
  Button,
  Chip,
  FormScreenFrame,
  StickyActionFrame,
  Stack,
} from '@jjoin/design-system';
import { computeCoinShortfall, computeRewardEligibleSlots } from '@jjoin/domain';
import { t } from '@jjoin/i18n';
import { JoinMethod, SCREEN_GOLF_CODE, IdentityStatus } from '@jjoin/types';
import { RewardCoinInput } from '../../src/ui/patterns/RewardCoinInput';
import { CoinSummaryCard } from '../../src/ui/patterns/CoinSummaryCard';
import { useJoinCoinPreview } from '../../src/features/create/useJoinCoinPreview';
import { getSecureSessionStore, useSession } from '../../src/session/SessionContext';
import { getApiClient } from '../../src/lib/api';
import { JoinCreateVenueSection } from '../../src/features/join-create/components/JoinCreateVenueSection';
import {
  clearJoinCreateDraft,
  peekJoinCreateDraft,
  saveJoinCreateDraft,
} from '../../src/features/join-create/model/join-create-draft';
import {
  type JoinCreateVenueSelection,
  venueSelectionFromVenueDto,
  venueSelectionHasPlace,
} from '../../src/features/join-create/model/join-create-venue';

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
  const params = useLocalSearchParams<{
    venueId?: string;
    venueName?: string;
    venueAddress?: string;
  }>();
  const routeVenueId = typeof params.venueId === 'string' ? params.venueId : undefined;
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);

  const [selectedVenue, setSelectedVenue] = useState<JoinCreateVenueSelection | null>(null);
  const [players, setPlayers] = useState(4);
  const [rewardPerParticipant, setRewardPerParticipant] = useState('0');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneJoinId, setDoneJoinId] = useState<string | null>(null);
  const [resolvingRouteVenue, setResolvingRouteVenue] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const draft = peekJoinCreateDraft();
      if (draft) {
        setPlayers(draft.players);
        if (draft.selectedVenue && !routeVenueId) {
          setSelectedVenue(draft.selectedVenue);
        }
        clearJoinCreateDraft();
      }
    }, [routeVenueId]),
  );

  useEffect(() => {
    if (!routeVenueId) return;
    let cancelled = false;
    setResolvingRouteVenue(true);
    void (async () => {
      try {
        const v = await api.getVenue(routeVenueId);
        if (cancelled) return;
        setSelectedVenue(
          venueSelectionFromVenueDto({
            venueId: v.venueId,
            name: typeof params.venueName === 'string' ? params.venueName : v.name,
            address: v.address,
            roadAddress:
              typeof params.venueAddress === 'string' ? params.venueAddress : v.roadAddress,
            phone: null,
            latitude: v.latitude,
            longitude: v.longitude,
          }),
        );
      } catch {
        if (!cancelled) {
          setError('선택한 장소 정보를 불러올 수 없습니다.');
        }
      } finally {
        if (!cancelled) setResolvingRouteVenue(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, params.venueAddress, params.venueName, routeVenueId]);

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
  const venueReady = venueSelectionHasPlace(selectedVenue) && !resolvingRouteVenue;
  const createDisabled =
    !venueReady || submitting || (identityVerified && (!canCreate || previewLoading));
  const createLabel = identityVerified
    ? canCreate
      ? '조인 생성'
      : t('create.coin.insufficientCta')
    : '조인 생성';

  const onPickFromMap = useCallback(() => {
    saveJoinCreateDraft({ players, selectedVenue });
    router.push({
      pathname: '/(tabs)/explore',
      params: { venuePick: '1' },
    } as Href);
  }, [players, router, selectedVenue]);

  const onCreate = useCallback(async () => {
    const gate = requestGatedAction({ type: 'CREATE_JOIN' });
    if (!gate.allowed) {
      router.push('/auth/gate');
      return;
    }
    if (submitting) return;
    if (!venueSelectionHasPlace(selectedVenue)) {
      setError('장소를 먼저 선택해주세요.');
      return;
    }
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
      const detail = await api.createJoin({
        sportCode: SCREEN_GOLF_CODE,
        venueId: selectedVenue.venueId,
        startAt: defaultStartAtIso(),
        plannedPlayerCount: players,
        joinMethod: JoinMethod.APPROVAL,
        title: `${selectedVenue.name} 스크린골프`,
        rewardPerParticipant,
        idempotencyKey: newIdempotencyKey(),
      });
      setDoneJoinId(detail.joinId);
      clearJoinCreateDraft();
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
    api,
    canCreate,
    players,
    requestGatedAction,
    rewardPerParticipant,
    router,
    selectedVenue,
    shortfall,
    submitting,
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

        <JoinCreateVenueSection
          api={api}
          selected={selectedVenue}
          onChange={setSelectedVenue}
          onPickFromMap={onPickFromMap}
        />

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

        {!venueSelectionHasPlace(selectedVenue) ? (
          <Text variant="caption" tone="tertiary">
            장소를 먼저 선택해주세요.
          </Text>
        ) : null}

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
});
