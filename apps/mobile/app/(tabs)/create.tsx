import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import {
  Text,
  Button,
  Chip,
  FormScreenFrame,
  StickyActionFrame,
  Stack,
} from '@jjoin/design-system';
import { computeCoinShortfall, computeRewardEligibleSlots, formatNumber } from '@jjoin/domain';
import { t } from '@jjoin/i18n';
import { JoinMethod, SCREEN_GOLF_CODE, IdentityStatus } from '@jjoin/types';
import { RewardCoinInput } from '../../src/ui/patterns/RewardCoinInput';
import { CoinSummaryCard } from '../../src/ui/patterns/CoinSummaryCard';
import { useJoinCoinPreview } from '../../src/features/create/useJoinCoinPreview';
import { resolveJoinCreateFooterState } from '../../src/features/join-create/model/join-create-footer-state';
import {
  resolveJoinCreatePlayersFromParams,
  resolveJoinCreateRewardFromParams,
  shouldResetJoinCreateSession,
} from '../../src/features/join-create/model/join-create-session';
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
    players?: string;
    rewardPerParticipant?: string;
    clubId?: string;
    clubEventId?: string;
    startsAt?: string;
    title?: string;
    inviteeUserId?: string;
    inviteeNickname?: string;
  }>();
  const routeVenueId =
    typeof params.venueId === 'string' && params.venueId.trim()
      ? params.venueId.trim()
      : undefined;
  const routeClubId = typeof params.clubId === 'string' ? params.clubId : undefined;
  const routeClubEventId = typeof params.clubEventId === 'string' ? params.clubEventId : undefined;
  const routeStartsAt = typeof params.startsAt === 'string' ? params.startsAt : undefined;
  const routeTitle = typeof params.title === 'string' ? params.title : undefined;
  const routeInviteeUserId =
    typeof params.inviteeUserId === 'string' && params.inviteeUserId.trim()
      ? params.inviteeUserId.trim()
      : undefined;
  const routeInviteeNickname =
    typeof params.inviteeNickname === 'string' && params.inviteeNickname.trim()
      ? params.inviteeNickname.trim()
      : undefined;
  const [prefilledInvitees, setPrefilledInvitees] = useState<
    Array<{ userId: string; nickname: string }>
  >(() =>
    routeInviteeUserId
      ? [{ userId: routeInviteeUserId, nickname: routeInviteeNickname ?? '초대 대상' }]
      : [],
  );
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);

  const [selectedVenue, setSelectedVenue] = useState<JoinCreateVenueSelection | null>(null);
  const [players, setPlayers] = useState(() =>
    resolveJoinCreatePlayersFromParams(
      typeof params.players === 'string' ? params.players : undefined,
    ),
  );
  const [rewardPerParticipant, setRewardPerParticipant] = useState(() =>
    resolveJoinCreateRewardFromParams(
      typeof params.rewardPerParticipant === 'string' ? params.rewardPerParticipant : undefined,
    ),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneJoinId, setDoneJoinId] = useState<string | null>(null);
  const [resolvingRouteVenue, setResolvingRouteVenue] = useState(false);
  /** Set on successful create; cleared when a new Create session starts. */
  const lastCompletedJoinIdRef = useRef<string | null>(null);
  /** True after leaving Create while a success screen was showing. */
  const pendingNewSessionRef = useRef(false);

  const resetFormForNewSession = useCallback(() => {
    setSelectedVenue(null);
    setPlayers(
      resolveJoinCreatePlayersFromParams(
        typeof params.players === 'string' ? params.players : undefined,
      ),
    );
    setRewardPerParticipant(
      resolveJoinCreateRewardFromParams(
        typeof params.rewardPerParticipant === 'string'
          ? params.rewardPerParticipant
          : undefined,
      ),
    );
    setSubmitting(false);
    setError(null);
    clearJoinCreateDraft();
  }, [params.players, params.rewardPerParticipant]);

  useFocusEffect(
    useCallback(() => {
      // New Create entry after leaving a success screen — never restore that success.
      if (shouldResetJoinCreateSession({ pendingNewSession: pendingNewSessionRef.current })) {
        pendingNewSessionRef.current = false;
        lastCompletedJoinIdRef.current = null;
        setDoneJoinId(null);
        resetFormForNewSession();
      }

      const draft = peekJoinCreateDraft();
      if (draft) {
        setPlayers(draft.players);
        if (draft.selectedVenue && !routeVenueId) {
          setSelectedVenue(draft.selectedVenue);
        }
        clearJoinCreateDraft();
      }

      return () => {
        // Success stays visible until leave; next focus starts a fresh write session.
        if (lastCompletedJoinIdRef.current != null) {
          pendingNewSessionRef.current = true;
        }
      };
    }, [resetFormForNewSession, routeVenueId]),
  );

  useEffect(() => {
    if (routeVenueId) return;
    const venueName = typeof params.venueName === 'string' ? params.venueName : '';
    if (!venueName.trim()) return;
    setSelectedVenue({
      name: venueName,
      address: typeof params.venueAddress === 'string' ? params.venueAddress : '',
      source: 'CUSTOM',
    });
  }, [params.venueAddress, params.venueName, routeVenueId]);

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

  const footerState = useMemo(
    () =>
      resolveJoinCreateFooterState({
        venueReady,
        resolvingRouteVenue,
        submitting,
        identityVerified,
        previewLoading,
        canCreate,
        preview,
        shortfall,
        insufficientCtaLabel: t('create.coin.insufficientCta'),
        insufficientLabel: t('create.coin.insufficientAmount'),
      }),
    [
      canCreate,
      identityVerified,
      preview,
      previewLoading,
      resolvingRouteVenue,
      shortfall,
      submitting,
      venueReady,
    ],
  );

  const onPickFromMap = useCallback(() => {
    saveJoinCreateDraft({ players, selectedVenue });
    router.push({
      pathname: '/(tabs)/screen',
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
          ? t('create.coin.insufficientAmount').replace('{amount}', formatNumber(shortfall))
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
        startAt: routeStartsAt ?? defaultStartAtIso(),
        plannedPlayerCount: players,
        joinMethod: JoinMethod.APPROVAL,
        title: routeTitle ?? `${selectedVenue.name} 스크린골프`,
        rewardPerParticipant,
        idempotencyKey: newIdempotencyKey(),
        clubId: routeClubId,
        clubEventId: routeClubEventId,
      });
      if (prefilledInvitees.length > 0) {
        try {
          await api.createJoinInvitations(detail.joinId, {
            inviteeUserIds: prefilledInvitees.map((p) => p.userId),
          });
        } catch {
          // Join already created — invitation failure is non-fatal for create UX.
        }
      }
      setDoneJoinId(detail.joinId);
      lastCompletedJoinIdRef.current = detail.joinId;
      clearJoinCreateDraft();
      setPrefilledInvitees([]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'create_failed';
      if (msg.startsWith('network_error')) setError('네트워크 오류 — API 연결을 확인하세요.');
      else if (msg.includes('401')) setError('로그인이 필요합니다.');
      else if (msg.includes('INSUFFICIENT_BALANCE')) setError(t('create.coin.insufficient'));
      else if (msg.includes('JOIN_HOST_LIMIT')) {
        Alert.alert(
          '조인 생성 제한',
          '일반 회원은 동시에 운영 중인 조인 수에 제한이 있습니다. 프리미엄 회원은 제한 없이 조인을 만들 수 있습니다.',
          [
            { text: '닫기', style: 'cancel' },
            { text: '프리미엄 알아보기', onPress: () => router.push('/my/premium') },
          ],
        );
      } else setError('조인 생성에 실패했습니다.');
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
    routeClubEventId,
    routeClubId,
    routeStartsAt,
    routeTitle,
    selectedVenue,
    shortfall,
    submitting,
    prefilledInvitees,
  ]);

  if (doneJoinId) {
    return (
      <FormScreenFrame>
        <Stack gap="md">
          <Text variant="sectionTitle" tone="primary">
            조인 생성 완료
          </Text>
          <Text variant="body" tone="secondary">
            조인 생성비는 사용 처리되고, 참가보상은 예치(HOLD)로 기록되었습니다. 생성비는 취소·정산
            시 자동 환불되지 않습니다.
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
          {footerState.helperText ? (
            <Text variant="caption" tone="secondary" style={styles.footerHelper}>
              {footerState.helperText}
            </Text>
          ) : null}
          {footerState.showWalletCta ? (
            <Button
              label="코인 충전하기"
              variant="secondary"
              size="sm"
              onPress={() => router.push('/my/coin-charge')}
            />
          ) : null}
          <Button
            disabled={footerState.createDisabled}
            label={footerState.createLabel}
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

        {prefilledInvitees.length > 0 ? (
          <Stack gap="xs">
            <Text variant="sectionTitle" tone="primary">
              초대할 사람
            </Text>
            <View style={styles.row}>
              {prefilledInvitees.map((person) => (
                <Chip
                  key={person.userId}
                  label={`${person.nickname} ×`}
                  selected
                  onPress={() =>
                    setPrefilledInvitees((prev) => prev.filter((p) => p.userId !== person.userId))
                  }
                />
              ))}
            </View>
          </Stack>
        ) : null}

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
          creatorUserTypeLabel={preview?.creatorUserTypeLabel}
          creationCoinEnabled={preview?.creationCoinEnabled}
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
  footerHelper: { textAlign: 'center' },
});
