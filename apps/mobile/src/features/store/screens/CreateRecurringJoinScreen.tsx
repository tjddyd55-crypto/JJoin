import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
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
  MatchingRewardTarget,
  StoreOwnershipStatus,
  type CreateRecurringJoinScheduleRequest,
  type StoreOwnershipDto,
} from '@jjoin/types';
import { createRecurringJoinScheduleSchema } from '@jjoin/validation';
import { getApiClient } from '../../../lib/api';
import { getSecureSessionStore } from '../../../session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../../ui/nested-screen';
import { GENDER_PRESETS } from '../store-ui';
import { DAY_OF_WEEK_OPTIONS } from '../recurring-join-ui';

const REWARD_TARGET_OPTIONS = [
  { value: MatchingRewardTarget.FEMALE, label: '여성' },
  { value: MatchingRewardTarget.MALE, label: '남성' },
  { value: MatchingRewardTarget.ALL, label: '전원' },
] as const;

export function CreateRecurringJoinScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ storeOwnershipId?: string }>();
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);

  const [stores, setStores] = useState<StoreOwnershipDto[]>([]);
  const [storeOwnershipId, setStoreOwnershipId] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTimeLocal, setStartTimeLocal] = useState('19:00');
  const [targetMaleCount, setTargetMaleCount] = useState(2);
  const [targetFemaleCount, setTargetFemaleCount] = useState(2);
  const [minimumPlayers, setMinimumPlayers] = useState('3');
  const [matchingRewardTarget, setMatchingRewardTarget] = useState<MatchingRewardTarget>(
    MatchingRewardTarget.FEMALE,
  );
  const [rewardPerParticipant, setRewardPerParticipant] = useState('5000');
  const [recruitClosesHoursBefore, setRecruitClosesHoursBefore] = useState('2');
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

  function applyGenderPreset(label: string, male: number, female: number) {
    setGenderPresetLabel(label);
    setTargetMaleCount(male);
    setTargetFemaleCount(female);
    if (label === '무관4') {
      setMatchingRewardTarget(MatchingRewardTarget.ALL);
    }
  }

  async function onCreate() {
    const body: CreateRecurringJoinScheduleRequest = {
      storeOwnershipId,
      dayOfWeek,
      startTimeLocal: startTimeLocal.trim(),
      targetMaleCount,
      targetFemaleCount,
      minimumPlayers: Number(minimumPlayers),
      matchingRewardTarget,
      rewardPerParticipant: rewardPerParticipant.trim(),
      recruitClosesHoursBefore: Number(recruitClosesHoursBefore) || undefined,
    };
    const parsed = createRecurringJoinScheduleSchema.safeParse(body);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? '입력값을 확인해 주세요.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.createRecurringJoin(parsed.data as CreateRecurringJoinScheduleRequest);
      router.replace('/my/recurring-joins');
    } catch {
      setError('정기 조인 생성에 실패했습니다.');
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
            label="정기 조인 만들기"
            loading={submitting}
            disabled={!storeOwnershipId || submitting}
            onPress={() => void onCreate()}
            fullWidth
          />
        </StickyActionFrame>
      }
    >
      <Text variant="body" tone="secondary">
        매주 지정한 요일·시간에 모집 조인을 자동으로 생성합니다.
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
          <Section title="요일">
            <View style={styles.chipRow}>
              {DAY_OF_WEEK_OPTIONS.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  selected={dayOfWeek === option.value}
                  onPress={() => setDayOfWeek(option.value)}
                />
              ))}
            </View>
          </Section>

          <Spacer size="lg" />
          <Section title="시간">
            <Input
              label="시작 시간 (HH:mm, KST)"
              value={startTimeLocal}
              onChangeText={setStartTimeLocal}
              placeholder="19:00"
            />
            <Spacer size="sm" />
            <Input
              label="모집 마감 (시작 N시간 전)"
              value={recruitClosesHoursBefore}
              onChangeText={setRecruitClosesHoursBefore}
              keyboardType="number-pad"
              placeholder="2"
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
});
