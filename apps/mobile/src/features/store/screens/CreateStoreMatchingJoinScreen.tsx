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
  const params = useLocalSearchParams<{ storeOwnershipId?: string }>();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);

  const [stores, setStores] = useState<StoreOwnershipDto[]>([]);
  const [storeOwnershipId, setStoreOwnershipId] = useState('');
  const [startAt, setStartAt] = useState(defaultStoreJoinStartAtIso());
  const [recruitClosesAt, setRecruitClosesAt] = useState(() =>
    defaultRecruitClosesAtIso(defaultStoreJoinStartAtIso()),
  );
  const [targetMaleCount, setTargetMaleCount] = useState(2);
  const [targetFemaleCount, setTargetFemaleCount] = useState(2);
  const [minimumPlayers, setMinimumPlayers] = useState('3');
  const [matchingRewardTarget, setMatchingRewardTarget] = useState<MatchingRewardTarget>(
    MatchingRewardTarget.FEMALE,
  );
  const [rewardPerParticipant, setRewardPerParticipant] = useState('5000');
  const [genderPresetLabel, setGenderPresetLabel] = useState('남2여2');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError('매장 코인 잔액이 부족합니다.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const created = await api.createStoreJoin(parsed.data as CreateStoreMatchingJoinRequest);
      router.replace({ pathname: '/join/[joinId]', params: { joinId: created.joinId } });
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      setError(msg.includes('insufficient') ? '매장 코인 잔액이 부족합니다.' : '조인 생성에 실패했습니다.');
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
            disabled={!canAfford || !storeOwnershipId}
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
            승인된 매장이 없습니다.
          </Text>
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
              label="시작 일시 (ISO)"
              value={startAt}
              onChangeText={setStartAt}
              placeholder="2026-08-27T18:00:00.000Z"
            />
            <Spacer size="sm" />
            <Input
              label="모집 마감 일시 (ISO)"
              value={recruitClosesAt}
              onChangeText={setRecruitClosesAt}
              placeholder="2026-08-27T17:00:00.000Z"
            />
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
              남 {targetMaleCount} · 여 {targetFemaleCount}
            </Text>
          </Section>

          <Spacer size="lg" />
          <Section title="모집 조건">
            <Input
              label="최소 인원"
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
              label="참가자당 리워드 (Coin)"
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
                    필요 홀드
                  </Text>
                  <Text variant="bodyStrong" tone="primary">
                    {coinRequirement.rewardHoldTotal} Coin
                  </Text>
                </Row>
                <Row justify="space-between">
                  <Text variant="body" tone="secondary">
                    매장 사용 가능
                  </Text>
                  <Text variant="bodyStrong" tone="primary">
                    {selectedStore?.walletAvailable ?? '0'} Coin
                  </Text>
                </Row>
                {!canAfford ? (
                  <Text variant="body" tone="error" style={styles.shortfall}>
                    잔액이 부족합니다.
                  </Text>
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
});
