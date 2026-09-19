import { View } from 'react-native';
import { Button, Chip, Input, Spacer, Text } from '@jjoin/design-system';
import { StorePriceDayType, type StorePriceSlotInput } from '@jjoin/types';
import { STORE_PRICE_DAY_TYPES, formatStorePriceDayTypeLabel } from '@jjoin/domain';

type Props = {
  slots: StorePriceSlotInput[];
  onChange: (slots: StorePriceSlotInput[]) => void;
};

const DEFAULT_SLOT: StorePriceSlotInput = {
  dayType: StorePriceDayType.WEEKDAY,
  startTime: '09:00',
  endTime: '18:00',
  price: 15000,
};

export function StorePriceSlotEditor({ slots, onChange }: Props) {
  function update(index: number, patch: Partial<StorePriceSlotInput>) {
    onChange(slots.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <View>
      <Text variant="label">이용요금</Text>
      <Spacer size="xs" />
      {slots.map((slot, index) => (
        <View key={`${index}-${slot.startTime}`} style={{ gap: 8, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {STORE_PRICE_DAY_TYPES.map((dayType) => (
              <Chip
                key={dayType}
                label={formatStorePriceDayTypeLabel(dayType)}
                selected={slot.dayType === dayType}
                onPress={() => update(index, { dayType: dayType as StorePriceDayType })}
              />
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Input
              label="시작"
              value={slot.startTime}
              onChangeText={(startTime) => update(index, { startTime })}
              style={{ flex: 1 }}
            />
            <Input
              label="종료"
              value={slot.endTime}
              onChangeText={(endTime) => update(index, { endTime })}
              style={{ flex: 1 }}
            />
          </View>
          <Input
            label="가격(원)"
            value={String(slot.price)}
            keyboardType="number-pad"
            onChangeText={(raw) => update(index, { price: Number(raw.replace(/[^\d]/g, '')) || 0 })}
          />
          <Button
            label="삭제"
            variant="secondary"
            onPress={() => onChange(slots.filter((_, i) => i !== index))}
          />
        </View>
      ))}
      <Button label="+ 시간대 추가" variant="secondary" onPress={() => onChange([...slots, DEFAULT_SLOT])} />
    </View>
  );
}
