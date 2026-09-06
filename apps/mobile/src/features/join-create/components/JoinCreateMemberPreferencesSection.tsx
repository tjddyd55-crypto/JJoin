import { Pressable, StyleSheet, View } from 'react-native';
import { Chip, Text } from '@jjoin/design-system';
import {
  JOIN_MEMBER_MAX_AGE,
  JOIN_MEMBER_MIN_AGE,
} from '@jjoin/domain';
import { JoinPreferredGender } from '@jjoin/types';

export type JoinMemberPreferencesState = {
  preferredGender: JoinPreferredGender;
  minAge: number | null;
  maxAge: number | null;
};

type Props = {
  value: JoinMemberPreferencesState;
  onChange: (next: JoinMemberPreferencesState) => void;
};

const GENDER_OPTIONS: Array<{ value: JoinPreferredGender; label: string }> = [
  { value: JoinPreferredGender.FEMALE, label: '여성' },
  { value: JoinPreferredGender.MALE, label: '남성' },
  { value: JoinPreferredGender.ANY, label: '무관' },
];

function clampAge(value: number): number {
  return Math.min(JOIN_MEMBER_MAX_AGE, Math.max(JOIN_MEMBER_MIN_AGE, value));
}

function formatAgeSummary(minAge: number | null, maxAge: number | null): string {
  if (minAge != null && maxAge != null) return `${minAge}세 ~ ${maxAge}세`;
  if (minAge != null) return `${minAge}세 이상`;
  if (maxAge != null) return `${maxAge}세 이하`;
  return '제한 없음';
}

function AgeStepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (next: number | null) => void;
}) {
  const display = value != null ? `${value}세` : '제한 없음';

  const bump = (delta: number) => {
    if (value == null) {
      onChange(clampAge(35 + delta));
      return;
    }
    const next = clampAge(value + delta);
    onChange(next);
  };

  return (
    <View style={styles.stepperRow}>
      <Text variant="caption" tone="secondary">{label}</Text>
      <View style={styles.stepperControls}>
        <Pressable accessibilityRole="button" onPress={() => bump(-1)} style={styles.stepBtn}>
          <Text variant="bodyStrong" tone="primary">−</Text>
        </Pressable>
        <Text variant="bodyStrong" tone="primary" style={styles.stepValue}>{display}</Text>
        <Pressable accessibilityRole="button" onPress={() => bump(1)} style={styles.stepBtn}>
          <Text variant="bodyStrong" tone="primary">+</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => onChange(null)} style={styles.clearBtn}>
          <Text variant="caption" tone="tertiary">해제</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function JoinCreateMemberPreferencesSection({ value, onChange }: Props) {
  const setGender = (preferredGender: JoinPreferredGender) => {
    onChange({ ...value, preferredGender });
  };

  const setMinAge = (minAge: number | null) => {
    let maxAge = value.maxAge;
    if (minAge != null && maxAge != null && minAge > maxAge) {
      maxAge = minAge;
    }
    onChange({ ...value, minAge, maxAge });
  };

  const setMaxAge = (maxAge: number | null) => {
    let minAge = value.minAge;
    if (maxAge != null && minAge != null && minAge > maxAge) {
      minAge = maxAge;
    }
    onChange({ ...value, minAge, maxAge });
  };

  return (
    <View style={styles.root}>
      <Text variant="sectionTitle" tone="primary">원하는 멤버</Text>
      <Text variant="caption" tone="secondary" style={styles.hint}>
        참가 조건 안내용입니다. 신청 차단은 적용되지 않습니다.
      </Text>

      <Text variant="bodyStrong" tone="primary" style={styles.label}>성별</Text>
      <View style={styles.row}>
        {GENDER_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            selected={value.preferredGender === opt.value}
            onPress={() => setGender(opt.value)}
          />
        ))}
      </View>

      <Text variant="bodyStrong" tone="primary" style={styles.label}>연령대</Text>
      <Text variant="body" tone="primary" style={styles.ageSummary}>
        {formatAgeSummary(value.minAge, value.maxAge)}
      </Text>
      <AgeStepper label="최소" value={value.minAge} onChange={setMinAge} />
      <AgeStepper label="최대" value={value.maxAge} onChange={setMaxAge} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 10 },
  hint: { marginBottom: 4 },
  label: { marginTop: 4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ageSummary: { fontSize: 16 },
  stepperRow: { gap: 6 },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: { minWidth: 72, textAlign: 'center' },
  clearBtn: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
});

export function defaultJoinMemberPreferences(): JoinMemberPreferencesState {
  return {
    preferredGender: JoinPreferredGender.ANY,
    minAge: null,
    maxAge: null,
  };
}

export function memberPreferencesPayload(state: JoinMemberPreferencesState) {
  const preferredGender =
    state.preferredGender === JoinPreferredGender.ANY ? null : state.preferredGender;
  return {
    preferredGender,
    minAge: state.minAge,
    maxAge: state.maxAge,
  };
}

export function memberPreferencesSummaryLabel(state: JoinMemberPreferencesState): string {
  const parts: string[] = [];
  if (state.preferredGender === JoinPreferredGender.MALE) parts.push('남성');
  else if (state.preferredGender === JoinPreferredGender.FEMALE) parts.push('여성');
  const age = formatAgeSummary(state.minAge, state.maxAge);
  if (age !== '제한 없음') parts.push(age);
  return parts.length > 0 ? parts.join(' · ') : '무관';
}
