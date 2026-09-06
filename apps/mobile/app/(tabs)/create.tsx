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
  Input,
  Card,
} from '@jjoin/design-system';
import { computeCoinShortfall, computeRewardEligibleSlots, formatNumber, requiresIdentityGate } from '@jjoin/domain';
import { t } from '@jjoin/i18n';
import { JoinMethod, SCREEN_GOLF_CODE, IdentityStatus } from '@jjoin/types';
import { RewardCoinInput } from '../../src/ui/patterns/RewardCoinInput';
import { useJoinCoinPreview } from '../../src/features/create/useJoinCoinPreview';
import { resolveJoinCreateFooterState } from '../../src/features/join-create/model/join-create-footer-state';
import {
  resolveJoinCreatePlayersFromParams,
  resolveJoinCreateRewardFromParams,
  shouldResetJoinCreateSession,
} from '../../src/features/join-create/model/join-create-session';
import { getSecureSessionStore, useSession } from '../../src/session/SessionContext';
import { getApiClient } from '../../src/lib/api';
import { resolveAppVariant } from '../../src/lib/app-variant';
import { JoinCreateVenueSection } from '../../src/features/join-create/components/JoinCreateVenueSection';
import { JoinCreateStepHeader, JoinCreateSummaryRow } from '../../src/features/join-create/components/JoinCreateStepHeader';
import { JoinCreatePricingSummary } from '../../src/features/join-create/components/JoinCreatePricingSummary';
import {
  JoinCreateMemberPreferencesSection,
  defaultJoinMemberPreferences,
  memberPreferencesPayload,
  memberPreferencesSummaryLabel,
} from '../../src/features/join-create/components/JoinCreateMemberPreferencesSection';
import {
  clearJoinCreateDraft,
  peekJoinCreateDraft,
  saveJoinCreateDraft,
} from '../../src/features/join-create/model/join-create-draft';
import {
  type JoinCreateVenueSelection,
  venueSelectionFromVenueDto,
  venueSelectionHasPlace,
  venueSelectionLabel,
} from '../../src/features/join-create/model/join-create-venue';
import {
  JOIN_CREATE_STEPS,
  type JoinCreateStepId,
  canAdvanceJoinCreateStep,
  joinCreateStepIndex,
} from '../../src/features/join-create/model/join-create-steps';
import { KstDatePickerField } from '../../src/shared/date/KstDatePickerField';
import { KstTimePickerField } from '../../src/shared/date/KstTimePickerField';
import { composeKstIso, splitKstDateTime } from '../../src/features/store/matching-join-ui';
import {
  formatJoinScheduleDetailDate,
  formatJoinScheduleDetailTime,
} from '../../src/ui/join-display';

function defaultStartParts() {
  const d = new Date(Date.now() + 2 * 60 * 60_000);
  d.setMinutes(0, 0, 0);
  const iso = d.toISOString();
  return splitKstDateTime(iso);
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

  const defaultParts = useMemo(() => {
    if (routeStartsAt) return splitKstDateTime(routeStartsAt);
    return defaultStartParts();
  }, [routeStartsAt]);

  const [prefilledInvitees, setPrefilledInvitees] = useState<
    Array<{ userId: string; nickname: string }>
  >(() =>
    routeInviteeUserId
      ? [{ userId: routeInviteeUserId, nickname: routeInviteeNickname ?? '초대 대상' }]
      : [],
  );
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);

  const [step, setStep] = useState<JoinCreateStepId>('venue');
  const [selectedVenue, setSelectedVenue] = useState<JoinCreateVenueSelection | null>(null);
  const [gameDate, setGameDate] = useState(defaultParts.dateYmd);
  const [startTime, setStartTime] = useState(defaultParts.timeHm);
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
  const [description, setDescription] = useState('');
  const [joinMethod, setJoinMethod] = useState<JoinMethod>(JoinMethod.APPROVAL);
  const [memberPrefs, setMemberPrefs] = useState(defaultJoinMemberPreferences);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneJoinId, setDoneJoinId] = useState<string | null>(null);
  const [resolvingRouteVenue, setResolvingRouteVenue] = useState(false);
  const lastCompletedJoinIdRef = useRef<string | null>(null);
  const pendingNewSessionRef = useRef(false);

  const startAtIso = useMemo(() => {
    try {
      return composeKstIso(gameDate, startTime);
    } catch {
      return '';
    }
  }, [gameDate, startTime]);

  const resetFormForNewSession = useCallback(() => {
    setStep('venue');
    setSelectedVenue(null);
    setGameDate(defaultParts.dateYmd);
    setStartTime(defaultParts.timeHm);
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
    setDescription('');
    setJoinMethod(JoinMethod.APPROVAL);
    setMemberPrefs(defaultJoinMemberPreferences());
    setSubmitting(false);
    setError(null);
    clearJoinCreateDraft();
  }, [defaultParts.dateYmd, defaultParts.timeHm, params.players, params.rewardPerParticipant]);

  useFocusEffect(
    useCallback(() => {
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
        if (!cancelled) setError('선택한 장소 정보를 불러올 수 없습니다.');
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
  const identityVerified = me?.identity.verificationStatus === IdentityStatus.VERIFIED;
  const identityGateApplies = requiresIdentityGate(
    me?.identity.verificationStatus ?? IdentityStatus.UNVERIFIED,
    'CREATE_JOIN',
    { appVariant: resolveAppVariant() },
  );
  const identityVerifiedForCreateFlow = !identityGateApplies || identityVerified;
  const venueReady = venueSelectionHasPlace(selectedVenue) && !resolvingRouteVenue;
  const startAtValid = Boolean(startAtIso) && new Date(startAtIso).getTime() > Date.now();

  const footerState = useMemo(
    () =>
      resolveJoinCreateFooterState({
        venueReady,
        resolvingRouteVenue,
        submitting,
        identityVerified: identityVerifiedForCreateFlow,
        previewLoading,
        canCreate,
        preview,
        shortfall,
        insufficientCtaLabel: t('create.coin.insufficientCta'),
        insufficientLabel: t('create.coin.insufficientAmount'),
      }),
    [
      canCreate,
      identityVerifiedForCreateFlow,
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
      setStep('venue');
      return;
    }
    if (!startAtValid) {
      setError('날짜와 시간을 확인해주세요.');
      setStep('venue');
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
        startAt: startAtIso,
        plannedPlayerCount: players,
        joinMethod,
        title: routeTitle ?? `${selectedVenue.name} 스크린골프`,
        description: description.trim() || null,
        rewardPerParticipant,
        idempotencyKey: newIdempotencyKey(),
        clubId: routeClubId,
        clubEventId: routeClubEventId,
        ...memberPreferencesPayload(memberPrefs),
      });
      if (prefilledInvitees.length > 0) {
        try {
          await api.createJoinInvitations(detail.joinId, {
            inviteeUserIds: prefilledInvitees.map((p) => p.userId),
          });
        } catch {
          // non-fatal
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
    description,
    joinMethod,
    memberPrefs,
    players,
    prefilledInvitees,
    requestGatedAction,
    rewardPerParticipant,
    router,
    routeClubEventId,
    routeClubId,
    routeTitle,
    selectedVenue,
    shortfall,
    startAtIso,
    startAtValid,
    submitting,
  ]);

  const stepIndex = joinCreateStepIndex(step);
  const isLastStep = step === 'confirm';
  const canGoNext = canAdvanceJoinCreateStep(step, {
    venueReady,
    startAtValid,
    players,
  });

  const goNext = () => {
    if (!canGoNext) {
      if (step === 'venue') setError('장소와 일정을 확인해주세요.');
      return;
    }
    setError(null);
    const next = JOIN_CREATE_STEPS[stepIndex + 1];
    if (next) setStep(next.id);
  };

  const goBack = () => {
    setError(null);
    const prev = JOIN_CREATE_STEPS[stepIndex - 1];
    if (prev) setStep(prev.id);
  };

  const scheduleSummary = startAtIso
    ? `${formatJoinScheduleDetailDate(startAtIso)} ${formatJoinScheduleDetailTime(startAtIso)}`
    : '일정 선택';

  if (doneJoinId) {
    return (
      <FormScreenFrame>
        <Stack gap="md">
          <Text variant="sectionTitle" tone="primary">조인 생성 완료</Text>
          <Text variant="body" tone="secondary">
            조인이 생성되었습니다. 상세에서 참가자를 확인하세요.
          </Text>
          <Button
            label="조인 상세"
            onPress={() =>
              router.push({ pathname: '/join/[joinId]', params: { joinId: doneJoinId } } as Href)
            }
          />
          <Button label="내 조인" variant="secondary" onPress={() => router.push('/(tabs)/my-joins')} />
        </Stack>
      </FormScreenFrame>
    );
  }

  const footer = isLastStep ? (
    <StickyActionFrame>
      {footerState.helperText ? (
        <Text variant="caption" tone="secondary" style={styles.footerHelper}>
          {footerState.helperText}
        </Text>
      ) : null}
      {footerState.showWalletCta ? (
        <Button label="코인 충전하기" variant="secondary" size="sm" onPress={() => router.push('/my/coin-charge')} />
      ) : null}
      <Button
        disabled={footerState.createDisabled}
        label={footerState.createLabel}
        loading={submitting}
        onPress={() => void onCreate()}
      />
    </StickyActionFrame>
  ) : (
    <StickyActionFrame>
      <View style={styles.footerRow}>
        {stepIndex > 0 ? (
          <Button label="이전" variant="secondary" onPress={goBack} style={styles.footerBtn} />
        ) : null}
        <Button
          label="다음"
          onPress={goNext}
          disabled={!canGoNext}
          style={styles.footerBtn}
        />
      </View>
    </StickyActionFrame>
  );

  return (
    <FormScreenFrame footer={footer}>
      <Stack gap="md">
        <Text variant="screenTitle" tone="primary">조인 만들기</Text>
        <JoinCreateStepHeader current={step} onSelect={(s) => setStep(s)} />

        {step !== 'venue' ? (
          <Card variant="base" padding="md">
            <JoinCreateSummaryRow
              label="장소"
              value={selectedVenue ? venueSelectionLabel(selectedVenue) : '미선택'}
              onPress={() => setStep('venue')}
            />
            <JoinCreateSummaryRow label="일정" value={scheduleSummary} onPress={() => setStep('venue')} />
          </Card>
        ) : null}

        {step === 'venue' ? (
          <>
            <JoinCreateVenueSection
              api={api}
              selected={selectedVenue}
              onChange={setSelectedVenue}
              onPickFromMap={onPickFromMap}
            />
            <KstDatePickerField label="날짜" dateYmd={gameDate} onChange={setGameDate} />
            <KstTimePickerField label="시작 시간" valueHm={startTime} onChange={setStartTime} />
            {!startAtValid && venueReady ? (
              <Text variant="caption" tone="error">시작 시간은 현재보다 이후여야 합니다.</Text>
            ) : null}
          </>
        ) : null}

        {step === 'capacity' ? (
          <>
            <Text variant="sectionTitle" tone="primary">모집 인원 {players}명</Text>
            <Text variant="caption" tone="secondary">
              {t('create.players.hint')} · 보상 대상 {rewardEligibleSlots}명
            </Text>
            <View style={styles.row}>
              {[2, 3, 4].map((n) => (
                <Chip key={n} label={`${n}명`} selected={players === n} onPress={() => setPlayers(n)} />
              ))}
            </View>
            <RewardCoinInput
              onChange={setRewardPerParticipant}
              rewardEligibleSlots={rewardEligibleSlots}
              value={rewardPerParticipant}
            />
            <JoinCreatePricingSummary
              roomCreationFee={preview?.roomCreationFee}
              rewardPerParticipant={preview?.rewardPerParticipant}
              rewardEligibleSlots={preview?.rewardEligibleSlots}
              totalRequiredCoin={preview?.totalRequiredCoin}
              walletAvailable={preview?.walletAvailable}
              loading={previewLoading && !preview}
              error={previewError}
              shortfall={shortfall}
              creatorUserTypeLabel={preview?.creatorUserTypeLabel}
              creationCoinEnabled={preview?.creationCoinEnabled}
            />
          </>
        ) : null}

        {step === 'members' ? (
          <JoinCreateMemberPreferencesSection value={memberPrefs} onChange={setMemberPrefs} />
        ) : null}

        {step === 'options' ? (
          <>
            <Text variant="sectionTitle" tone="primary">승인 방식</Text>
            <View style={styles.row}>
              <Chip
                label="승인 후 참가"
                selected={joinMethod === JoinMethod.APPROVAL}
                onPress={() => setJoinMethod(JoinMethod.APPROVAL)}
              />
              <Chip
                label="참가 즉시 확정"
                selected={joinMethod === JoinMethod.OPEN}
                onPress={() => setJoinMethod(JoinMethod.OPEN)}
              />
            </View>
            <Text variant="sectionTitle" tone="primary" style={styles.optionsTitle}>
              무료 초대
            </Text>
            {prefilledInvitees.length > 0 ? (
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
            ) : (
              <Text variant="meta" tone="tertiary">무료 초대 대상이 없습니다.</Text>
            )}
          </>
        ) : null}

        {step === 'confirm' ? (
          <>
            <Input
              label="추가 안내 (선택)"
              value={description}
              onChangeText={setDescription}
              placeholder="참가자에게 전달할 메모"
              multiline
            />
            <Card variant="elevated" padding="md">
              <JoinCreateSummaryRow label="장소" value={selectedVenue ? venueSelectionLabel(selectedVenue) : '—'} />
              <JoinCreateSummaryRow label="일정" value={scheduleSummary} />
              <JoinCreateSummaryRow label="인원" value={`${players}명`} />
              <JoinCreateSummaryRow
                label="원하는 멤버"
                value={memberPreferencesSummaryLabel(memberPrefs)}
                onPress={() => setStep('members')}
              />
              <JoinCreateSummaryRow
                label="승인 방식"
                value={joinMethod === JoinMethod.OPEN ? '참가 즉시 확정' : '승인 후 참가'}
                onPress={() => setStep('options')}
              />
              <JoinCreateSummaryRow
                label="참가보상"
                value={Number(rewardPerParticipant) > 0 ? `${rewardPerParticipant} 코인` : '없음'}
              />
              {description.trim() ? (
                <JoinCreateSummaryRow label="추가 안내" value={description.trim()} />
              ) : null}
            </Card>
            <JoinCreatePricingSummary
              roomCreationFee={preview?.roomCreationFee}
              rewardPerParticipant={preview?.rewardPerParticipant}
              rewardEligibleSlots={preview?.rewardEligibleSlots}
              totalRequiredCoin={preview?.totalRequiredCoin}
              walletAvailable={preview?.walletAvailable}
              loading={previewLoading && !preview}
              error={previewError}
              shortfall={shortfall}
              creatorUserTypeLabel={preview?.creatorUserTypeLabel}
              creationCoinEnabled={preview?.creationCoinEnabled}
            />
          </>
        ) : null}

        {error ? (
          <Text variant="body" tone="error">{error}</Text>
        ) : null}
      </Stack>
    </FormScreenFrame>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionsTitle: { marginTop: 8 },
  footerHelper: { textAlign: 'center' },
  footerRow: { flexDirection: 'row', gap: 8 },
  footerBtn: { flex: 1 },
});
