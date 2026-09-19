import { View } from 'react-native';
import { Button, Chip, Input, Spacer, Text } from '@jjoin/design-system';
import { formatStoreOperatingDayGroupLabel } from '@jjoin/domain';
import { StoreOperatingDayGroup, type StoreOperatingHoursInput } from '@jjoin/types';

type Props = {
  rows: StoreOperatingHoursInput[];
  onChange: (rows: StoreOperatingHoursInput[]) => void;
};

const DEFAULT_ROW: StoreOperatingHoursInput = {
  dayGroup: StoreOperatingDayGroup.WEEKDAY,
  startTime: '09:00',
  endTime: '24:00',
  isClosed: false,
  is24Hours: false,
};

export function StoreOperatingHoursEditor({ rows, onChange }: Props) {
  function update(index: number, patch: Partial<StoreOperatingHoursInput>) {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <View>
      <Text variant="label">운영시간</Text>
      <Spacer size="xs" />
      {rows.map((row, index) => (
        <View key={`${index}-${row.dayGroup}`} style={{ gap: 8, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(['WEEKDAY', 'WEEKEND'] as StoreOperatingDayGroup[]).map((dayGroup) => (
              <Chip
                key={dayGroup}
                label={formatStoreOperatingDayGroupLabel(dayGroup)}
                selected={row.dayGroup === dayGroup}
                onPress={() => update(index, { dayGroup })}
              />
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Chip
              label="휴무"
              selected={Boolean(row.isClosed)}
              onPress={() => update(index, { isClosed: !row.isClosed, is24Hours: false })}
            />
            <Chip
              label="24시간"
              selected={Boolean(row.is24Hours)}
              onPress={() => update(index, { is24Hours: !row.is24Hours, isClosed: false })}
            />
          </View>
          {!row.isClosed && !row.is24Hours ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Input
                label="시작"
                value={row.startTime ?? ''}
                onChangeText={(startTime) => update(index, { startTime })}
                style={{ flex: 1 }}
              />
              <Input
                label="종료"
                value={row.endTime ?? ''}
                onChangeText={(endTime) => update(index, { endTime })}
                style={{ flex: 1 }}
              />
            </View>
          ) : null}
          <Button
            label="삭제"
            variant="secondary"
            onPress={() => onChange(rows.filter((_, i) => i !== index))}
          />
        </View>
      ))}
      <Button label="+ 운영시간 추가" variant="secondary" onPress={() => onChange([...rows, DEFAULT_ROW])} />
    </View>
  );
}
