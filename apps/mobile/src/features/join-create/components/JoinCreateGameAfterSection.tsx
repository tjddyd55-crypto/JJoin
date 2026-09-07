import { StyleSheet, View } from 'react-native';
import {
  AFTER_MEMO_CUSTOM_PRESET_LABEL,
  AFTER_MEMO_PRESETS,
  GAME_MEMO_CUSTOM_PRESET_LABEL,
  GAME_MEMO_PRESETS,
  JOIN_AFTER_MEMO_MAX_LENGTH,
  JOIN_GAME_MEMO_MAX_LENGTH,
} from '@jjoin/domain';
import { Chip, PresetMemoField, Text } from '@jjoin/design-system';
import { JoinAfterPlan, JoinGameStyle } from '@jjoin/types';
import type { JoinCreateRoomCharacterState } from '../model/join-create-room-character';

const GAME_OPTIONS: Array<{ value: JoinGameStyle; label: string; description: string }> = [
  {
    value: JoinGameStyle.FRIENDLY,
    label: '친선 위주',
    description: '별도 게임 없이 편하게 플레이해요.',
  },
  {
    value: JoinGameStyle.LIGHT_GAME,
    label: '가벼운 게임 있음',
    description: '가벼운 게임이 있을 수 있어요. 메모로 분위기를 알려주세요.',
  },
  {
    value: JoinGameStyle.DECIDE_ON_SITE,
    label: '현장에서 결정',
    description: '참가자들과 만나서 게임 여부와 방식을 정해요.',
  },
];

const AFTER_OPTIONS: Array<{ value: JoinAfterPlan; label: string; description: string }> = [
  { value: JoinAfterPlan.NONE, label: '없음', description: '애프터는 없습니다.' },
  {
    value: JoinAfterPlan.MEAL_OR_DRINK,
    label: '식사/한잔 예정',
    description: '게임 후 식사나 한잔 계획이 있어요.',
  },
  {
    value: JoinAfterPlan.DECIDE_ON_SITE,
    label: '현장에서 결정',
    description: '참가자들과 이야기해서 식사나 한잔 여부를 정해요.',
  },
];

type Props = {
  value: JoinCreateRoomCharacterState;
  onChange: (next: JoinCreateRoomCharacterState) => void;
};

export function JoinCreateGameAfterSection({ value, onChange }: Props) {
  const gameSelected = GAME_OPTIONS.find((opt) => opt.value === value.gameStyle);
  const afterSelected = AFTER_OPTIONS.find((opt) => opt.value === value.afterPlan);

  return (
    <View style={styles.root}>
      <Text variant="sectionTitle" tone="primary">게임 방식</Text>
      <View style={styles.row}>
        {GAME_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            selected={value.gameStyle === opt.value}
            onPress={() => onChange({ ...value, gameStyle: opt.value })}
          />
        ))}
      </View>
      {gameSelected ? (
        <Text variant="caption" tone="secondary">{gameSelected.description}</Text>
      ) : null}
      <PresetMemoField
        label="게임 메모"
        presets={GAME_MEMO_PRESETS}
        customPresetLabel={GAME_MEMO_CUSTOM_PRESET_LABEL}
        value={value.gameMemo}
        onChange={(gameMemo) => onChange({ ...value, gameMemo })}
        maxLength={JOIN_GAME_MEMO_MAX_LENGTH}
        visible={value.gameStyle === JoinGameStyle.LIGHT_GAME}
      />

      <Text variant="sectionTitle" tone="primary" style={styles.sectionGap}>애프터 플랜</Text>
      <View style={styles.row}>
        {AFTER_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            selected={value.afterPlan === opt.value}
            onPress={() => onChange({ ...value, afterPlan: opt.value })}
          />
        ))}
      </View>
      {afterSelected ? (
        <Text variant="caption" tone="secondary">{afterSelected.description}</Text>
      ) : null}
      <PresetMemoField
        label="애프터 메모"
        presets={AFTER_MEMO_PRESETS}
        customPresetLabel={AFTER_MEMO_CUSTOM_PRESET_LABEL}
        value={value.afterMemo}
        onChange={(afterMemo) => onChange({ ...value, afterMemo })}
        maxLength={JOIN_AFTER_MEMO_MAX_LENGTH}
        visible={value.afterPlan === JoinAfterPlan.MEAL_OR_DRINK}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sectionGap: { marginTop: 12 },
});
