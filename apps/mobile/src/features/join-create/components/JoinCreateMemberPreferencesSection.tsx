import { StyleSheet, View } from 'react-native';
import { AgeRangeSelector, Chip, Text } from '@jjoin/design-system';
import {
  JOIN_MEMBER_MAX_AGE,
  JOIN_MEMBER_MIN_AGE,
  formatAgeRangeLabel,
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

export function defaultJoinMemberPreferences(): JoinMemberPreferencesState {
  return {
    preferredGender: JoinPreferredGender.ANY,
    minAge: null,
    maxAge: null,
  };
}

export function memberPreferencesPayload(value: JoinMemberPreferencesState) {
  return {
    preferredGender: value.preferredGender,
    minAge: value.minAge,
    maxAge: value.maxAge,
  };
}

export function memberPreferencesSummaryLabel(value: JoinMemberPreferencesState): string {
  const parts: string[] = [];
  if (value.preferredGender === JoinPreferredGender.FEMALE) parts.push('여성');
  else if (value.preferredGender === JoinPreferredGender.MALE) parts.push('남성');
  parts.push(formatAgeRangeLabel(value.minAge, value.maxAge));
  return parts.filter(Boolean).join(' · ');
}

export function JoinCreateMemberPreferencesSection({ value, onChange }: Props) {
  const setGender = (preferredGender: JoinPreferredGender) => {
    onChange({ ...value, preferredGender });
  };

  const setAgeRange = (next: { minAge: number | null; maxAge: number | null }) => {
    onChange({ ...value, ...next });
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
      <AgeRangeSelector
        minBound={JOIN_MEMBER_MIN_AGE}
        maxBound={JOIN_MEMBER_MAX_AGE}
        value={{ minAge: value.minAge, maxAge: value.maxAge }}
        onChange={setAgeRange}
        unrestrictedLabel="연령 제한 없음"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 8 },
  hint: { marginBottom: 4 },
  label: { marginTop: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
