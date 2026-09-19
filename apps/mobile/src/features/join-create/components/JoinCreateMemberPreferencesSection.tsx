import { StyleSheet, View } from 'react-native';
import { AgeRangeSelector, Chip, Text } from '@jjoin/design-system';
import {
  JOIN_MEMBER_MAX_AGE,
  JOIN_MEMBER_MIN_AGE,
  formatAgeRangeLabel,
} from '@jjoin/domain';
import { JoinPreferredGender } from '@jjoin/types';
import {
  FIELD_AGE_MODE_CHIPS,
  applyFieldAgeMode,
  applyFieldAgeRange,
  defaultFieldAgeCondition,
  fieldAgeConditionPayload,
  type FieldAgeConditionMode,
  type FieldAgeConditionState,
} from '../model/field-join-age-condition';

export type JoinMemberPreferencesState = {
  preferredGender: JoinPreferredGender;
  minAge: number | null;
  maxAge: number | null;
  ageMode?: FieldAgeConditionMode;
  draftMinAge?: number;
  draftMaxAge?: number;
};

type Props = {
  value: JoinMemberPreferencesState;
  onChange: (next: JoinMemberPreferencesState) => void;
  /** FIELD create: chips like gender. SCREEN keeps the always-visible slider. */
  ageChoice?: 'slider' | 'chips';
};

export function defaultJoinMemberPreferences(): JoinMemberPreferencesState {
  return {
    preferredGender: JoinPreferredGender.ANY,
    minAge: null,
    maxAge: null,
  };
}

export function defaultFieldJoinMemberPreferences(): JoinMemberPreferencesState {
  const age = defaultFieldAgeCondition();
  return {
    preferredGender: JoinPreferredGender.ANY,
    ...age,
  };
}

export function memberPreferencesPayload(value: JoinMemberPreferencesState) {
  const age =
    value.ageMode != null
      ? fieldAgeConditionPayload({
          ageMode: value.ageMode,
          minAge: value.minAge,
          maxAge: value.maxAge,
          draftMinAge: value.draftMinAge ?? 35,
          draftMaxAge: value.draftMaxAge ?? 49,
        })
      : { minAge: value.minAge, maxAge: value.maxAge };
  return {
    preferredGender: value.preferredGender,
    minAge: age.minAge,
    maxAge: age.maxAge,
  };
}

export function memberPreferencesSummaryLabel(value: JoinMemberPreferencesState): string {
  const parts: string[] = [];
  if (value.preferredGender === JoinPreferredGender.FEMALE) parts.push('여성');
  else if (value.preferredGender === JoinPreferredGender.MALE) parts.push('남성');
  const age = memberPreferencesPayload(value);
  parts.push(formatAgeRangeLabel(age.minAge, age.maxAge));
  return parts.filter(Boolean).join(' · ');
}

function toAgeState(value: JoinMemberPreferencesState): FieldAgeConditionState {
  return {
    ageMode: value.ageMode ?? (value.minAge != null || value.maxAge != null ? 'SPECIFY' : 'ANY'),
    minAge: value.minAge,
    maxAge: value.maxAge,
    draftMinAge: value.draftMinAge ?? value.minAge ?? 35,
    draftMaxAge: value.draftMaxAge ?? value.maxAge ?? 49,
  };
}

export function JoinCreateMemberPreferencesSection({
  value,
  onChange,
  ageChoice = 'slider',
}: Props) {
  const setAgeRange = (next: { minAge: number | null; maxAge: number | null }) => {
    if (ageChoice === 'chips') {
      onChange({ ...value, ...applyFieldAgeRange(toAgeState(value), next) });
      return;
    }
    onChange({ ...value, ...next });
  };

  const setAgeMode = (mode: FieldAgeConditionMode) => {
    onChange({ ...value, ...applyFieldAgeMode(toAgeState(value), mode) });
  };

  const showSlider = ageChoice === 'slider' || value.ageMode === 'SPECIFY';

  return (
    <View style={styles.root}>
      <Text variant="sectionTitle" tone="primary">
        {ageChoice === 'chips' ? '나이' : '원하는 멤버'}
      </Text>
      <Text variant="caption" tone="secondary" style={styles.hint}>
        참가 조건 안내용입니다. 신청 차단은 적용되지 않습니다.
      </Text>

      {ageChoice === 'chips' ? (
        <View style={styles.row}>
          {FIELD_AGE_MODE_CHIPS.map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              selected={(value.ageMode ?? 'ANY') === opt.value}
              onPress={() => setAgeMode(opt.value)}
            />
          ))}
        </View>
      ) : (
        <Text variant="bodyStrong" tone="primary" style={styles.label}>연령대</Text>
      )}

      {showSlider ? (
        <AgeRangeSelector
          minBound={JOIN_MEMBER_MIN_AGE}
          maxBound={JOIN_MEMBER_MAX_AGE}
          value={{ minAge: value.minAge, maxAge: value.maxAge }}
          onChange={setAgeRange}
          unrestrictedLabel="연령 제한 없음"
          showUnrestrictedControl={ageChoice === 'slider'}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 8 },
  hint: { marginBottom: 4 },
  label: { marginTop: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
