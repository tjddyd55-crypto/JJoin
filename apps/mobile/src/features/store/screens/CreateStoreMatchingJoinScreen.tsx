import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Button,
  Card,
  Chip,
  FormScreenFrame,
  Input,
  Row,
  Section,
  Spacer,
  StickyActionFrame,
  Text,
} from '@jjoin/design-system';
import {
  canAffordMatchingJoinCreate,
  computeMatchingJoinCoinRequirement,
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
        ? params.rewardPerParticipant
        : '5000',
  );
  const [genderPresetLabel, setGenderPresetLabel] = useState('남2여2');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startAt = useMemo(() => {
    try {
      return composeKstIso(gameDate, startTime);
    } catch {
      return '';
    }
  }, [gameDate, startTime]);

  const recruitClosesAt = useMemo(() => {
    try {
      return composeKstIso(gameDate, closeTime);
    } catch {
      return '';
    }
  }, [closeTime, gameDate]);

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
        rewardPerParticipant,
      });
    } catch {
      return null;
    }
  }, [matchingRewardTarget, rewardPerParticipant, targetFemaleCount, targetMaleCount]);

  const canAfford = useMemo(() => {
    if (!coinRequirement || !selectedStore?.walletAvailable) return false;
    return canAffordMatchingJoinCreate(
      selectedStore.walletAvailable,
      coinRequirement.totalRequiredCoin,
    );
  }, [coinRequirement, selectedStore?.walletAvailable]);

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
    const parsed = createStoreMatchingJoinSchema.safeParse({
      storeOwnershipId,
      startAt,
      recruitClosesAt,
      targetMaleCount,
      targetFemaleCount,
      minimumPlayers: Number(minimumPlayers),
      matchingRewardTarget,
      rewardPerParticipant,
      idempotencyKey: newIdempotencyKey(),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? '입력값을 확인해 주세요.');
      return;
    }
    if (!canAfford) {
      setError('코인이 부족합니다.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.createStoreJoin(parsed.data as CreateStoreMatchingJoinRequest);
      router.replace('/my/stores');
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      setError(msg.includes('insufficient') ? '코인이 부족합니다.' : '조인 생성에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormScreenFrame
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
      <Text variant="screenTitle" tone="primary">
        모집 조인 만들기
      </Text>
      <Spacer size="sm" />
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
            <Input
              label="게임 날짜 (YYYY-MM-DD)"
              value={gameDate}
              onChangeText={setGameDate}
              placeholder="2026-08-28"
            />
            <Spacer size="sm" />
            <Input
              label="시작 시간 (HH:mm, KST)"
              value={startTime}
              onChangeText={setStartTime}
              placeholder="20:00"
            />
            <Spacer size="sm" />
            <Input
              label="모집 마감 시간 (HH:mm, KST)"
              value={closeTime}
              onChangeText={setCloseTime}
              placeholder="18:00"
            />
            <Text variant="caption" tone="tertiary">
              마감은 시작({startTime || '—'})보다 이전이어야 합니다.
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
              value={rewardPerParticipant}
              onChangeText={setRewardPerParticipant}
              keyboardType="number-pad"
            />
          </Section>

          {coinRequirement ? (
            <>
              <Spacer size="lg" />
              <Card variant="elevated" padding="md">
                <Text variant="sectionTitle" tone="primary">
                  코인 홀드
                </Text>
                <Spacer size="sm" />
                <Row justify="space-between">
                  <Text variant="body" tone="secondary">
                    보유 코인
                  </Text>
                  <Text variant="bodyStrong" tone="primary">
                    {formatCoin(selectedStore?.walletAvailable ?? '0')}
                  </Text>
                </Row>
                <Row justify="space-between">
                  <Text variant="body" tone="secondary">
                    필요 HOLD
                  </Text>
                  <Text variant="bodyStrong" tone="primary">
                    {formatCoin(coinRequirement.rewardHoldTotal)}
                  </Text>
                </Row>
                <Row justify="space-between">
                  <Text variant="body" tone="secondary">
                    생성 후 사용 가능 예상
                  </Text>
                  <Text variant="bodyStrong" tone="primary">
                    {canAfford
                      ? formatCoin(
                          Number(selectedStore?.walletAvailable ?? 0) -
                            Number(coinRequirement.rewardHoldTotal),
                        )
                      : '—'}
                  </Text>
                </Row>
                {!canAfford ? (
                  <>
                    <Text variant="body" tone="error" style={styles.shortfall}>
                      코인이 부족합니다. 필요 {formatCoin(coinRequirement.rewardHoldTotal)} / 보유{' '}
                      {formatCoin(selectedStore?.walletAvailable ?? '0')}
                    </Text>
                    <Spacer size="sm" />
                    <Button
                      label="코인 충전"
                      variant="secondary"
                      onPress={() => router.push('/my/wallet')}
                      fullWidth
                    />
                  </>
                ) : null}
              </Card>
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
  shortfall: {
    marginTop: 8,
  },
  preview: {
    marginTop: 12,
  },
});
