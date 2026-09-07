import { StyleSheet, View } from 'react-native';
import {
  Chip,
  HandicapRangeSelector,
  Text,
} from '@jjoin/design-system';
import {
  DEFAULT_HANDICAP_RANGE_MAX,
  DEFAULT_HANDICAP_RANGE_MIN,
  SCREEN_HANDICAP_MAX,
  SCREEN_HANDICAP_MIN,
} from '@jjoin/domain';
import { JoinParticipantSkillMode } from '@jjoin/types';
import type { JoinCreateRoomCharacterState } from '../model/join-create-room-character';

const SKILL_OPTIONS: Array<{
  value: JoinParticipantSkillMode;
  label: string;
  description: string;
}> = [
  {
    value: JoinParticipantSkillMode.ANY,
    label: '실력 상관없음',
    description: '스크린골프 실력과 관계없이 누구나 참여할 수 있어요.',
  },
  {
    value: JoinParticipantSkillMode.BEGINNER_OK,
    label: '초보 가능',
    description: '스크린골프 경험이 적거나 핸디를 잘 모르는 분도 참여할 수 있어요.',
  },
  {
    value: JoinParticipantSkillMode.HANDICAP_RANGE,
    label: '핸디 범위 지정',
    description: '원하는 스크린 핸디 범위를 지정해요.',
  },
];

type Props = {
  value: JoinCreateRoomCharacterState;
  onChange: (next: JoinCreateRoomCharacterState) => void;
};

export function JoinCreateParticipantSkillSection({ value, onChange }: Props) {
  const setMode = (mode: JoinParticipantSkillMode) => {
    onChange({
      ...value,
      participantSkillMode: mode,
      ...(mode === 'HANDICAP_RANGE'
        ? {
            minScreenHandicap: value.minScreenHandicap || DEFAULT_HANDICAP_RANGE_MIN,
            maxScreenHandicap: value.maxScreenHandicap || DEFAULT_HANDICAP_RANGE_MAX,
          }
        : {}),
    });
  };

  const selected = SKILL_OPTIONS.find((opt) => opt.value === value.participantSkillMode);

  return (
    <View style={styles.root}>
      <Text variant="bodyStrong" tone="primary" style={styles.label}>참가 실력</Text>
      <View style={styles.row}>
        {SKILL_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            selected={value.participantSkillMode === opt.value}
            onPress={() => setMode(opt.value)}
          />
        ))}
      </View>
      {selected ? (
        <Text variant="caption" tone="secondary">{selected.description}</Text>
      ) : null}
      {value.participantSkillMode === JoinParticipantSkillMode.HANDICAP_RANGE ? (
        <HandicapRangeSelector
          minBound={SCREEN_HANDICAP_MIN}
          maxBound={SCREEN_HANDICAP_MAX}
          value={{ min: value.minScreenHandicap, max: value.maxScreenHandicap }}
          onChange={(next) =>
            onChange({ ...value, minScreenHandicap: next.min, maxScreenHandicap: next.max })
          }
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 8 },
  label: { marginTop: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
