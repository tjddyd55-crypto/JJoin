import { StyleSheet, View } from 'react-native';
import { Input, Text } from '@jjoin/design-system';
import { formatFieldGreenFeeLabel } from '@jjoin/domain';
import type { FieldJoinCreateCostState } from '../model/field-join-create-cost';
import { parseOptionalKrwInput } from '../model/field-join-create-cost';

type Props = {
  value: FieldJoinCreateCostState;
  onChange: (next: FieldJoinCreateCostState) => void;
};

export function FieldJoinCreateCostSection({ value, onChange }: Props) {
  return (
    <View style={styles.root}>
      <Text variant="sectionTitle" tone="primary">그린피</Text>
      <Text variant="caption" tone="secondary">
        카드에 보이는 금액은 1인 그린피입니다. 카트·캐디 금액은 받지 않고, 혜택으로만 표시합니다.
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
      <Text variant="bodyStrong" tone="primary">
        {formatFieldGreenFeeLabel(value.greenFeePerPerson) ?? '그린피 미입력'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 10 },
});
