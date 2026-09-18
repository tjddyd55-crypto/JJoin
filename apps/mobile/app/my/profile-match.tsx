import { useCallback, useMemo, useState } from 'react';
import { Switch, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Button, Chip, Input, ScrollScreenFrame, Spacer, Text } from '@jjoin/design-system';
import { DRINKING_HABITS, SMOKING_HABITS, formatDrinkingHabitLabel, formatSmokingHabitLabel } from '@jjoin/domain';
import type { DrinkingHabit, ProfileMatchPreferenceDto, SmokingHabit } from '@jjoin/types';
import { getApiClient } from '../../src/lib/api';
import { getSecureSessionStore } from '../../src/session/SessionContext';
import { NESTED_SCREEN_EDGES } from '../../src/ui/nested-screen';

const GENDERS = [
  { value: 'ANY', label: '전체' },
  { value: 'MALE', label: '남성 호스트' },
  { value: 'FEMALE', label: '여성 호스트' },
] as const;

export default function ProfileMatchScreen() {
  const api = useMemo(() => getApiClient(getSecureSessionStore()), []);
  const [pref, setPref] = useState<ProfileMatchPreferenceDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setPref(await api.getProfileMatchPreference());
      setError(null);
    } catch {
      setError('매칭 조건을 불러오지 못했습니다.');
    }
  }, [api]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!pref) {
    return (
      <ScrollScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
        <Text>{error ?? '불러오는 중…'}</Text>
      </ScrollScreenFrame>
    );
  }

  function toggleHabit<T extends string>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
  }

  async function save() {
    setBusy(true);
    try {
      setPref(
        await api.upsertProfileMatchPreference({
          enabled: pref.enabled,
          preferredGender: pref.preferredGender,
          minAge: pref.minAge,
          maxAge: pref.maxAge,
          minFieldHandicap: pref.minFieldHandicap,
          maxFieldHandicap: pref.maxFieldHandicap,
          minScreenHandicap: pref.minScreenHandicap,
          maxScreenHandicap: pref.maxScreenHandicap,
          drinkingHabits: pref.drinkingHabits,
          smokingHabits: pref.smokingHabits,
          sido: pref.sido,
          sigungu: pref.sigungu,
        }),
      );
      setError(null);
    } catch {
      setError('저장에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollScreenFrame edges={[...NESTED_SCREEN_EDGES]}>
      <Text variant="body" tone="secondary">
        조인 알림과 별도로, 호스트 프로필이 조건에 맞는 새 조인을 알려줍니다.
      </Text>
      <Spacer size="md" />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text variant="bodyStrong">프로필 매칭 알림</Text>
        <Switch
          value={pref.enabled}
          onValueChange={(enabled) => setPref({ ...pref, enabled })}
        />
      </View>
      <Spacer size="md" />
      <Text variant="label">호스트 성별</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        {GENDERS.map((item) => (
          <Chip
            key={item.value}
            label={item.label}
            selected={pref.preferredGender === item.value}
            onPress={() => setPref({ ...pref, preferredGender: item.value })}
          />
        ))}
      </View>
      <Spacer size="sm" />
      <Input
        label="최소 나이"
        value={pref.minAge == null ? '' : String(pref.minAge)}
        onChangeText={(v) => setPref({ ...pref, minAge: v ? Number(v) : null })}
        keyboardType="number-pad"
      />
      <Spacer size="sm" />
      <Input
        label="최대 나이"
        value={pref.maxAge == null ? '' : String(pref.maxAge)}
        onChangeText={(v) => setPref({ ...pref, maxAge: v ? Number(v) : null })}
        keyboardType="number-pad"
      />
      <Spacer size="sm" />
      <Input
        label="필드 핸디 최소"
        value={pref.minFieldHandicap == null ? '' : String(pref.minFieldHandicap)}
        onChangeText={(v) => setPref({ ...pref, minFieldHandicap: v ? Number(v) : null })}
        keyboardType="numbers-and-punctuation"
      />
      <Spacer size="sm" />
      <Input
        label="필드 핸디 최대"
        value={pref.maxFieldHandicap == null ? '' : String(pref.maxFieldHandicap)}
        onChangeText={(v) => setPref({ ...pref, maxFieldHandicap: v ? Number(v) : null })}
        keyboardType="numbers-and-punctuation"
      />
      <Spacer size="sm" />
      <Input
        label="스크린 핸디 최소"
        value={pref.minScreenHandicap == null ? '' : String(pref.minScreenHandicap)}
        onChangeText={(v) => setPref({ ...pref, minScreenHandicap: v ? Number(v) : null })}
        keyboardType="numbers-and-punctuation"
      />
      <Spacer size="sm" />
      <Input
        label="스크린 핸디 최대"
        value={pref.maxScreenHandicap == null ? '' : String(pref.maxScreenHandicap)}
        onChangeText={(v) => setPref({ ...pref, maxScreenHandicap: v ? Number(v) : null })}
        keyboardType="numbers-and-punctuation"
      />
      <Spacer size="sm" />
      <Text variant="label">음주</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        {DRINKING_HABITS.map((habit) => (
          <Chip
            key={habit}
            label={formatDrinkingHabitLabel(habit) ?? habit}
            selected={pref.drinkingHabits.includes(habit as DrinkingHabit)}
            onPress={() =>
              setPref({
                ...pref,
                drinkingHabits: toggleHabit(pref.drinkingHabits, habit as DrinkingHabit),
              })
            }
          />
        ))}
      </View>
      <Spacer size="sm" />
      <Text variant="label">흡연</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
        {SMOKING_HABITS.map((habit) => (
          <Chip
            key={habit}
            label={formatSmokingHabitLabel(habit) ?? habit}
            selected={pref.smokingHabits.includes(habit as SmokingHabit)}
            onPress={() =>
              setPref({
                ...pref,
                smokingHabits: toggleHabit(pref.smokingHabits, habit as SmokingHabit),
              })
            }
          />
        ))}
      </View>
      <Spacer size="sm" />
      <Input
        label="시/도 (선택)"
        value={pref.sido ?? ''}
        onChangeText={(v) => setPref({ ...pref, sido: v || null })}
      />
      <Spacer size="sm" />
      <Input
        label="시군구 (선택)"
        value={pref.sigungu ?? ''}
        onChangeText={(v) => setPref({ ...pref, sigungu: v || null })}
      />
      {error ? <Text tone="error">{error}</Text> : null}
      <Spacer size="md" />
      <Button label="저장" loading={busy} onPress={() => void save()} />
    </ScrollScreenFrame>
  );
}
