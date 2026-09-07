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
}> = [
  { value: JoinParticipantSkillMode.ANY, label: '실력 상관없음' },
  { value: JoinParticipantSkillMode.BEGINNER_OK, label: '초보 가능' },
  { value: JoinParticipantSkillMode.HANDICAP_RANGE, label: '핸디 범위 지정' },
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
