import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Button,
  Chip,
  FormScreenFrame,
  Input,
  Section,
  Spacer,
  StickyActionFrame,
  Text,
} from '@jjoin/design-system';
import {
  computeCoinShortfall,
  computeMatchingJoinCoinRequirement,
  computeWalletAfterCreation,
  formatCoin,
} from '@jjoin/domain';
import {
  MatchingRewardTarget,
  StoreOwnershipStatus,
  type CreateStoreMatchingJoinRequest,
  type StoreOwnershipDto,
} from '@jjoin/types';
import { createStoreMatchingJoinSchema } from '@jjoin/validation';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore } from '../../../session/SessionContext';
import { JoinCreatePricingSummary } from '../../join-create/components/JoinCreatePricingSummary';
import {
  isJoinCreateAuthError,
  isJoinHostLimitError,
  messageForJoinCreateError,
} from '../../join-create/join-create-error';
import { canSubmitStoreMatchingJoinCreate } from '../store-join-create-affordability';
import { KstDatePickerField } from '../../../shared/date/KstDatePickerField';
import { KstTimePickerField } from '../../../shared/date/KstTimePickerField';
import {
  formatNumberWithThousandsSeparator,
  normalizeRewardPerParticipantInput,
  parseNumericInput,
} from '../../../shared/number/numeric-input';
import { NESTED_SCREEN_EDGES } from '../../../ui/nested-screen';
import {
  composeKstIso,
  formatKstTime,
  splitKstDateTime,
} from '../matching-join-ui';
import {
  GENDER_PRESETS,
  defaultRecruitClosesAtIso,
  defaultStoreJoinStartAtIso,
} from '../store-ui';

const REWARD_TARGET_OPTIONS = [
  { value: MatchingRewardTarget.FEMALE, label: '여성' },
  { value: MatchingRewardTarget.MALE, label: '남성' },
  { value: MatchingRewardTarget.ALL, label: '전원' },
] as const;

function newIdempotencyKey() {
  return `store-join-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function CreateStoreMatchingJoinScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    storeOwnershipId?: string;
    sourceJoinId?: string;
    plannedPlayerCount?: string;
    targetMaleCount?: string;
    targetFemaleCount?: string;
    rewardPerParticipant?: string;
    matchingRewardTarget?: string;
    minimumPlayers?: string;
  }>();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);

  const defaultStart = defaultStoreJoinStartAtIso();
  const defaultClose = defaultRecruitClosesAtIso(defaultStart);
  const defaultStartParts = splitKstDateTime(defaultStart);
  const defaultCloseParts = splitKstDateTime(defaultClose);

  const [stores, setStores] = useState<StoreOwnershipDto[]>([]);
  const [storeOwnershipId, setStoreOwnershipId] = useState('');
  const [gameDate, setGameDate] = useState(defaultStartParts.dateYmd);
  const [startTime, setStartTime] = useState(defaultStartParts.timeHm);
  const [closeDate, setCloseDate] = useState(defaultCloseParts.dateYmd);
  const [closeTime, setCloseTime] = useState(defaultCloseParts.timeHm);
  const [targetMaleCount, setTargetMaleCount] = useState(() => {
    const n = Number(params.targetMaleCount);
    return Number.isFinite(n) && n >= 0 ? n : 2;
  });
  const [targetFemaleCount, setTargetFemaleCount] = useState(() => {
    const n = Number(params.targetFemaleCount);
    return Number.isFinite(n) && n >= 0 ? n : 2;
  });
  const [minimumPlayers, setMinimumPlayers] = useState(
    () => (typeof params.minimumPlayers === 'string' && params.minimumPlayers ? params.minimumPlayers : '3'),
  );
  const [matchingRewardTarget, setMatchingRewardTarget] = useState<MatchingRewardTarget>(() => {
    const raw = typeof params.matchingRewardTarget === 'string' ? params.matchingRewardTarget : '';
    if (raw === MatchingRewardTarget.MALE) return MatchingRewardTarget.MALE;
    if (raw === MatchingRewardTarget.ALL) return MatchingRewardTarget.ALL;
    return MatchingRewardTarget.FEMALE;
  });
  const [rewardPerParticipant, setRewardPerParticipant] = useState(
    () =>
      typeof params.rewardPerParticipant === 'string' && params.rewardPerParticipant
        ? normalizeRewardPerParticipantInput(params.rewardPerParticipant)
        : '5000',
  );
  const [genderPresetLabel, setGenderPresetLabel] = useState('남2여2');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idempotencyKeyRef = useRef(newIdempotencyKey());

  const startAt = useMemo(() => {
    try {
      return composeKstIso(gameDate, startTime);
    } catch {
      return '';
    }
  }, [gameDate, startTime]);

  const recruitClosesAt = useMemo(() => {
    try {
      return composeKstIso(closeDate, closeTime);
    } catch {
      return '';
    }
  }, [closeDate, closeTime]);

  const loadStores = useCallback(async () => {
    const items = await api.getMyStores({ includeWallet: true });
    const active = items.filter((store) => store.status === StoreOwnershipStatus.ACTIVE);
    setStores(active);
    const routeId =
      typeof params.storeOwnershipId === 'string' ? params.storeOwnershipId : undefined;
    if (routeId && active.some((store) => store.id === routeId)) {
      setStoreOwnershipId(routeId);
    } else if (active.length === 1) {
      setStoreOwnershipId(active[0]!.id);
    }
  }, [api, params.storeOwnershipId]);

  useEffect(() => {
    void loadStores().catch(() => setError('매장 목록을 불러오지 못했습니다.'));
  }, [loadStores]);

  const selectedStore = useMemo(
    () => stores.find((store) => store.id === storeOwnershipId) ?? null,
    [storeOwnershipId, stores],
  );

  const coinRequirement = useMemo(() => {
    try {
      return computeMatchingJoinCoinRequirement({
        targetMaleCount,
        targetFemaleCount,
        matchingRewardTarget,
        rewardPerParticipant: normalizeRewardPerParticipantInput(rewardPerParticipant),
      });
    } catch {
      return null;
    }
  }, [matchingRewardTarget, rewardPerParticipant, targetFemaleCount, targetMaleCount]);

  const canAfford = useMemo(() => {
    if (!coinRequirement) return false;
    return canSubmitStoreMatchingJoinCreate({
      walletAvailable: selectedStore?.walletAvailable,
      totalRequiredCoin: coinRequirement.totalRequiredCoin,
    });
  }, [coinRequirement, selectedStore?.walletAvailable]);

  const coinShortfall = useMemo(() => {
    if (!coinRequirement) return null;
    return computeCoinShortfall(
      selectedStore?.walletAvailable ?? '0',
      coinRequirement.totalRequiredCoin,
    );
  }, [coinRequirement, selectedStore?.walletAvailable]);

  const walletAfterCreation = useMemo(() => {
    if (!coinRequirement || !canAfford) return null;
    return computeWalletAfterCreation(
      selectedStore?.walletAvailable ?? '0',
      coinRequirement.totalRequiredCoin,
    );
  }, [canAfford, coinRequirement, selectedStore?.walletAvailable]);

  function applyGenderPreset(label: string, male: number, female: number) {
    setGenderPresetLabel(label);
    setTargetMaleCount(male);
    setTargetFemaleCount(female);
    if (label === '무관4') {
      setMatchingRewardTarget(MatchingRewardTarget.ALL);
    }
  }

  async function onCreate() {
    if (!startAt || !recruitClosesAt) {
      setError('날짜와 시간을 확인해 주세요.');
      return;
    }
    if (new Date(recruitClosesAt).getTime() >= new Date(startAt).getTime()) {
      setError('모집 마감은 시작 시간보다 이전이어야 합니다.');
      return;
    }
    if (new Date(startAt).getTime() <= Date.now()) {
      setError('시작 시간은 현재보다 이후여야 합니다.');
      return;
    }
    const parsed = createStoreMatchingJoinSchema.safeParse({
      storeOwnershipId,
      startAt,
      recruitClosesAt,
      targetMaleCount,
      targetFemaleCount,
      minimumPlayers: Number(minimumPlayers),
      matchingRewardTarget,
      rewardPerParticipant: normalizeRewardPerParticipantInput(rewardPerParticipant),
      idempotencyKey: idempotencyKeyRef.current,
    });
    if (!parsed.success) {
      const code = parsed.error.issues[0]?.message;
      setError(
        code === 'minimum_exceeds_planned'
          ? '최소 인원이 모집 인원보다 많습니다.'
          : code === 'matching_roster_required' || code === 'matching_roster_max_four'
            ? '모집 인원을 확인해주세요.'
            : '입력값을 확인해 주세요.',
      );
      return;
    }
    if (!canAfford) {
      setError('조인을 만들기 위한 코인이 부족합니다.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.createStoreJoin(parsed.data as CreateStoreMatchingJoinRequest);
      idempotencyKeyRef.current = newIdempotencyKey();
      router.replace('/my/stores');
    } catch (e) {
      if (isJoinCreateAuthError(e)) {
        setError(messageForJoinCreateError(e));
        router.push('/auth/gate');
        return;
      }
      if (isJoinHostLimitError(e)) {
        Alert.alert(
          '조인 생성 제한',
          '현재 생성 가능한 조인 수를 초과했습니다. 진행 중인 조인을 정리하거나 프리미엄을 확인해 주세요.',
          [{ text: '닫기', style: 'cancel' }],
        );
        return;
      }
      setError(messageForJoinCreateError(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormScreenFrame
      edges={[...NESTED_SCREEN_EDGES]}
      footer={
        <StickyActionFrame>
          <Button
            label="모집 조인 만들기"
            loading={submitting}
            disabled={!canAfford || !storeOwnershipId || submitting}
            onPress={() => void onCreate()}
            fullWidth
          />
        </StickyActionFrame>
      }
    >
      <Text variant="body" tone="secondary">
        매장 코인으로 리워드를 홀드한 뒤 참가자를 모집합니다.
      </Text>

      {stores.length === 0 ? (
        <>
          <Spacer size="md" />
          <Text variant="body" tone="error">
            승인된 매장이 없습니다. 매장 인증을 먼저 완료해 주세요.
          </Text>
          <Spacer size="md" />
          <Button
            label="매장 인증하기"
            variant="secondary"
            onPress={() => router.push('/my/store-verification')}
            fullWidth
          />
        </>
      ) : (
        <>
          <Spacer size="lg" />
          <Section title="매장 선택">
            <View style={styles.chipRow}>
              {stores.map((store) => (
                <Chip
                  key={store.id}
                  label={store.facilityName}
                  selected={storeOwnershipId === store.id}
                  onPress={() => setStoreOwnershipId(store.id)}
                />
              ))}
            </View>
          </Section>

          <Spacer size="lg" />
          <Section title="일정">
            <KstDatePickerField
              label="게임 날짜"
              dateYmd={gameDate}
              onChange={setGameDate}
              disallowPast
            />
            <Spacer size="sm" />
            <KstTimePickerField
              label="시작 시간"
              valueHm={startTime}
              onChange={setStartTime}
            />
            <Spacer size="sm" />
            <KstDatePickerField
              label="모집 마감 날짜"
              dateYmd={closeDate}
              onChange={setCloseDate}
              disallowPast
            />
            <Spacer size="sm" />
            <KstTimePickerField
              label="모집 마감 시간"
              valueHm={closeTime}
              onChange={setCloseTime}
            />
            <Text variant="caption" tone="tertiary">
              마감은 시작보다 이전이어야 합니다.
            </Text>
          </Section>

          <Spacer size="lg" />
          <Section title="성비 구성">
            <View style={styles.chipRow}>
              {GENDER_PRESETS.map((preset) => (
                <Chip
                  key={preset.label}
                  label={preset.label}
                  selected={genderPresetLabel === preset.label}
                  onPress={() =>
                    applyGenderPreset(
                      preset.label,
                      preset.targetMaleCount,
                      preset.targetFemaleCount,
                    )
                  }
                />
              ))}
            </View>
            <Spacer size="sm" />
            <Text variant="caption" tone="tertiary">
              목표 슬롯 · 남 {targetMaleCount} · 여 {targetFemaleCount}
            </Text>
          </Section>

          <Spacer size="lg" />
          <Section title="모집 조건">
            <Input
              label="최소 진행 인원"
              value={minimumPlayers}
              onChangeText={setMinimumPlayers}
              keyboardType="number-pad"
            />
            <Spacer size="md" />
            <Text variant="meta" tone="secondary">
              리워드 대상
            </Text>
            <View style={styles.chipRow}>
              {REWARD_TARGET_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  selected={matchingRewardTarget === option.value}
                  onPress={() => setMatchingRewardTarget(option.value)}
                />
              ))}
            </View>
            <Spacer size="sm" />
            <Input
              label="1인당 참가 보상 (Coin)"
              value={formatNumberWithThousandsSeparator(rewardPerParticipant)}
              onChangeText={(text) => {
                const next = parseNumericInput(text);
                setRewardPerParticipant(next ?? '');
              }}
              keyboardType="number-pad"
            />
          </Section>

          {coinRequirement ? (
            <>
              <Spacer size="lg" />
              <JoinCreatePricingSummary
                roomCreationFee={coinRequirement.roomCreationFee}
                rewardPerParticipant={coinRequirement.rewardPerParticipant}
                rewardEligibleSlots={coinRequirement.rewardEligibleSlots}
                totalRequiredCoin={coinRequirement.totalRequiredCoin}
                walletAvailable={selectedStore?.walletAvailable ?? '0'}
                shortfall={coinShortfall}
                creationCoinEnabled={Number(coinRequirement.roomCreationFee) > 0}
                creatorUserTypeLabel="업주 · 모집 조인"
              />
              {walletAfterCreation != null ? (
                <>
                  <Spacer size="sm" />
                  <Text variant="caption" tone="tertiary">
                    생성 후 사용 가능 예상 {formatCoin(walletAfterCreation)} (생성비와 참가보상
                    HOLD를 뺀 금액)
                  </Text>
                </>
              ) : (
                <>
                  <Spacer size="sm" />
                  <Button
                    label="코인 충전"
                    variant="secondary"
                    onPress={() => router.push('/my/wallet')}
                    fullWidth
                  />
                </>
              )}
            </>
          ) : null}
        </>
      )}

      {error ? (
        <>
          <Spacer size="sm" />
          <Text variant="body" tone="error">
            {error}
          </Text>
        </>
      ) : null}

      {startAt && recruitClosesAt ? (
        <Text variant="caption" tone="tertiary" style={styles.preview}>
          시작 {formatKstTime(startAt)} · 마감 {formatKstTime(recruitClosesAt)}
        </Text>
      ) : null}
    </FormScreenFrame>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  preview: {
    marginTop: 12,
  },
});
