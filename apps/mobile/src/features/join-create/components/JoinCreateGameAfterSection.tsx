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

const GAME_OPTIONS: Array<{ value: JoinGameStyle; label: string }> = [
  { value: JoinGameStyle.FRIENDLY, label: '친선 위주' },
  { value: JoinGameStyle.LIGHT_GAME, label: '가벼운 게임 있음' },
  { value: JoinGameStyle.DECIDE_ON_SITE, label: '현장에서 결정' },
];

const AFTER_OPTIONS: Array<{ value: JoinAfterPlan; label: string }> = [
  { value: JoinAfterPlan.NONE, label: '없음' },
  { value: JoinAfterPlan.MEAL_OR_DRINK, label: '식사/한잔 예정' },
  { value: JoinAfterPlan.DECIDE_ON_SITE, label: '현장에서 결정' },
];

type Props = {
  value: JoinCreateRoomCharacterState;
  onChange: (next: JoinCreateRoomCharacterState) => void;
};

export function JoinCreateGameAfterSection({ value, onChange }: Props) {
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
      <PresetMemoField
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
      <PresetMemoField
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
