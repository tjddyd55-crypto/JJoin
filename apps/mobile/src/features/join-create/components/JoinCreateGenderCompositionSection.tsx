import { StyleSheet, View } from 'react-native';
import { Chip, IconButton, Text } from '@jjoin/design-system';
import { normalizeFixedGenderComposition } from '@jjoin/domain';
import {
  adjustMaleCapacity,
  type JoinGenderCompositionState,
  validateJoinGenderCompositionClient,
  type JoinGenderCompositionMode,
} from '../model/join-create-gender-composition';
import type { MatchingGender } from '@jjoin/domain';

type Props = {
  totalCapacity: number;
  value: JoinGenderCompositionState;
  hostGender?: MatchingGender | null;
  onChange: (next: JoinGenderCompositionState) => void;
};

const MODE_OPTIONS: Array<{ value: JoinGenderCompositionMode; label: string }> = [
  { value: 'ANY', label: '성별 무관' },
  { value: 'FIXED', label: '남/여 인원 지정' },
];

export function JoinCreateGenderCompositionSection({
  totalCapacity,
  value,
  hostGender,
  onChange,
}: Props) {
  const setMode = (mode: JoinGenderCompositionMode) => {
    if (mode === value.mode) return;
    if (mode === 'FIXED') {
      const male = hostGender === 'FEMALE'
        ? Math.max(0, totalCapacity - 1)
        : hostGender === 'MALE'
          ? Math.max(1, Math.ceil(totalCapacity / 2))
          : Math.ceil(totalCapacity / 2);
      onChange({
        mode,
        maleCapacity: adjustMaleCapacity(0, male, totalCapacity, hostGender),
      });
      return;
    }
    onChange({ ...value, mode });
  };

  const { targetMaleCount, targetFemaleCount } =
    value.mode === 'FIXED'
      ? normalizeFixedGenderComposition(totalCapacity, value.maleCapacity)
      : { targetMaleCount: 0, targetFemaleCount: 0 };

  const validation = validateJoinGenderCompositionClient({
    state: value,
    totalCapacity,
    hostGender,
  });

  const setMale = (nextMale: number) => {
    onChange({
      ...value,
      maleCapacity: adjustMaleCapacity(nextMale, 0, totalCapacity, hostGender),
    });
  };

  const setFemale = (nextFemale: number) => {
    const male = totalCapacity - nextFemale;
    onChange({
      ...value,
      maleCapacity: adjustMaleCapacity(male, 0, totalCapacity, hostGender),
    });
  };

  return (
    <View style={styles.root}>
      <Text variant="sectionTitle" tone="primary">성별 구성</Text>
      <Text variant="caption" tone="secondary" style={styles.hint}>
        방장은 총 인원과 성별 구성에 포함됩니다.
      </Text>
      <View style={styles.row}>
        {MODE_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            selected={value.mode === opt.value}
            onPress={() => setMode(opt.value)}
          />
        ))}
      </View>

      {value.mode === 'FIXED' ? (
        <View style={styles.splitRow}>
          <GenderCounter
            label="남성"
            count={targetMaleCount}
            onDecrement={() => setMale(value.maleCapacity - 1)}
            onIncrement={() => setMale(value.maleCapacity + 1)}
            decrementDisabled={targetMaleCount <= (hostGender === 'MALE' ? 1 : 0)}
            incrementDisabled={targetMaleCount >= totalCapacity - (hostGender === 'FEMALE' ? 1 : 0)}
          />
          <GenderCounter
            label="여성"
            count={targetFemaleCount}
            onDecrement={() => setFemale(targetFemaleCount - 1)}
            onIncrement={() => setFemale(targetFemaleCount + 1)}
            decrementDisabled={targetFemaleCount <= (hostGender === 'FEMALE' ? 1 : 0)}
            incrementDisabled={targetFemaleCount >= totalCapacity - (hostGender === 'MALE' ? 1 : 0)}
          />
        </View>
      ) : null}

      {!validation.ok ? (
        <Text variant="caption" tone="error">{validation.message}</Text>
      ) : null}
    </View>
  );
}

function GenderCounter({
  label,
  count,
  onDecrement,
  onIncrement,
  decrementDisabled,
  incrementDisabled,
}: {
  label: string;
  count: number;
  onDecrement: () => void;
  onIncrement: () => void;
  decrementDisabled: boolean;
  incrementDisabled: boolean;
}) {
  return (
    <View style={styles.counter}>
      <Text variant="bodyStrong" tone="primary">{label}</Text>
      <View style={styles.counterControls}>
        <IconButton
          icon="minus"
          accessibilityLabel={`${label} 줄이기`}
          onPress={onDecrement}
          disabled={decrementDisabled}
          size="sm"
          variant="surface"
        />
        <Text variant="bodyStrong" tone="primary" style={styles.counterValue}>
          {count}
        </Text>
        <IconButton
          icon="plus"
          accessibilityLabel={`${label} 늘리기`}
          onPress={onIncrement}
          disabled={incrementDisabled}
          size="sm"
          variant="surface"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 8 },
  hint: { marginBottom: 4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  splitRow: { flexDirection: 'row', gap: 12 },
  counter: { flex: 1, gap: 8 },
  counterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  counterValue: {
    minWidth: 28,
    textAlign: 'center',
  },
});
