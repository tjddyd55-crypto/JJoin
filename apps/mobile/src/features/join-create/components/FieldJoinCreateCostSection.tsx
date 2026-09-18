import { StyleSheet, View } from 'react-native';
import { Chip, Input, Text } from '@jjoin/design-system';
import {
  formatFieldCaddieModeLabel,
  formatFieldExpectedCostLabel,
  formatFieldGreenFeePayerLabel,
  formatFieldSplitFeePayerLabel,
} from '@jjoin/domain';
import type { FieldJoinCreateCostState } from '../model/field-join-create-cost';
import { fieldJoinCostEstimate, parseOptionalKrwInput } from '../model/field-join-create-cost';

type Props = {
  value: FieldJoinCreateCostState;
  participantCount: number;
  onChange: (next: FieldJoinCreateCostState) => void;
};

export function FieldJoinCreateCostSection({ value, participantCount, onChange }: Props) {
  const estimate = fieldJoinCostEstimate(value, participantCount);

  return (
    <View style={styles.root}>
      <Text variant="sectionTitle" tone="primary">라운드 비용 (원)</Text>
      <Text variant="caption" tone="secondary">
        코인 보상과 별도입니다. 비워 두면 예상 비용에 넣지 않습니다.
      </Text>

      <Input
        label="1인 그린피"
        keyboardType="number-pad"
        value={value.greenFeePerPerson == null ? '' : String(value.greenFeePerPerson)}
        onChangeText={(text) =>
          onChange({ ...value, greenFeePerPerson: parseOptionalKrwInput(text) })
        }
        placeholder="예: 90000"
      />
      <View style={styles.row}>
        {(['EACH_PERSON', 'HOST'] as const).map((payer) => (
          <Chip
            key={payer}
            label={formatFieldGreenFeePayerLabel(payer)}
            selected={value.greenFeePayer === payer}
            onPress={() => onChange({ ...value, greenFeePayer: payer })}
          />
        ))}
      </View>

      <Input
        label="카트비 (팀 합계)"
        keyboardType="number-pad"
        value={value.cartFeeTotal == null ? '' : String(value.cartFeeTotal)}
        onChangeText={(text) => onChange({ ...value, cartFeeTotal: parseOptionalKrwInput(text) })}
        placeholder="예: 80000"
      />
      <View style={styles.row}>
        {(['EQUAL_SPLIT', 'HOST'] as const).map((payer) => (
          <Chip
            key={payer}
            label={formatFieldSplitFeePayerLabel(payer)}
            selected={value.cartFeePayer === payer}
            onPress={() => onChange({ ...value, cartFeePayer: payer })}
          />
        ))}
      </View>

      <Text variant="sectionTitle" tone="primary">캐디</Text>
      <View style={styles.row}>
        {(['NO_CADDIE', 'CADDIE'] as const).map((mode) => (
          <Chip
            key={mode}
            label={formatFieldCaddieModeLabel(mode)}
            selected={value.caddieMode === mode}
            onPress={() =>
              onChange({
                ...value,
                caddieMode: mode,
                caddieFeeTotal: mode === 'NO_CADDIE' ? null : value.caddieFeeTotal,
                caddieFeePayer: mode === 'NO_CADDIE' ? null : value.caddieFeePayer ?? 'EQUAL_SPLIT',
              })
            }
          />
        ))}
      </View>
      {value.caddieMode === 'CADDIE' ? (
        <>
          <Input
            label="캐디피 (팀 합계)"
            keyboardType="number-pad"
            value={value.caddieFeeTotal == null ? '' : String(value.caddieFeeTotal)}
            onChangeText={(text) =>
              onChange({ ...value, caddieFeeTotal: parseOptionalKrwInput(text) })
            }
            placeholder="예: 120000"
          />
          <View style={styles.row}>
            {(['EQUAL_SPLIT', 'HOST'] as const).map((payer) => (
              <Chip
                key={payer}
                label={formatFieldSplitFeePayerLabel(payer)}
                selected={value.caddieFeePayer === payer}
                onPress={() => onChange({ ...value, caddieFeePayer: payer })}
              />
            ))}
          </View>
        </>
      ) : null}

      <Text variant="bodyStrong" tone="primary">
        참가자 예상 {formatFieldExpectedCostLabel(estimate.participantExpectedKrw) ?? '미입력'}
      </Text>
      <Text variant="caption" tone="secondary">
        호스트 예상 {formatFieldExpectedCostLabel(estimate.hostExpectedKrw) ?? '미입력'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
