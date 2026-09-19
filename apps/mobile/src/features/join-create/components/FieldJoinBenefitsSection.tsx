import { StyleSheet, View } from 'react-native';
import { Chip, Text } from '@jjoin/design-system';
import type { FieldJoinBenefits } from '@jjoin/domain';

type Props = {
  value: FieldJoinBenefits;
  coinSelected: boolean;
  onChange: (next: FieldJoinBenefits) => void;
  onCoinChange: (selected: boolean) => void;
};

export function FieldJoinBenefitsSection({
  value,
  coinSelected,
  onChange,
  onCoinChange,
}: Props) {
  return (
    <View style={styles.root}>
      <Text variant="sectionTitle" tone="primary">참가자 혜택</Text>
      <Text variant="caption" tone="secondary">
        그린피·카트·캐디 지원은 방장의 약속입니다. 앱에서 원화 결제나 정산을 하지 않습니다.
      </Text>
      <View style={styles.row}>
        <Chip
          label="그린피 지원"
          selected={value.benefitGreenFee}
          onPress={() => onChange({ ...value, benefitGreenFee: !value.benefitGreenFee })}
        />
        <Chip
          label="카트 지원"
          selected={value.benefitCart}
          onPress={() => onChange({ ...value, benefitCart: !value.benefitCart })}
        />
        <Chip
          label="캐디 지원"
          selected={value.benefitCaddie}
          onPress={() => onChange({ ...value, benefitCaddie: !value.benefitCaddie })}
        />
        <Chip
          label="코인 보상"
          selected={coinSelected}
          onPress={() => onCoinChange(!coinSelected)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
