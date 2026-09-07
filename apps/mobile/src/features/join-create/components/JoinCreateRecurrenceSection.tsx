import { StyleSheet, View } from 'react-native';
import { Chip, Text } from '@jjoin/design-system';
import { KstDatePickerField } from '../../../shared/date/KstDatePickerField';
import {
  DAY_OF_WEEK_OPTIONS,
  hostRecurringSummaryLabel,
  isoWeekdayFromDateKey,
} from '../../store/recurring-join-ui';

export type RecurrenceMode = 'NONE' | 'WEEKLY';

type Props = {
  mode: RecurrenceMode;
  onModeChange: (mode: RecurrenceMode) => void;
  startDate: string;
  startTime: string;
  recurrenceEndDate: string;
  onRecurrenceEndDateChange: (value: string) => void;
  maxOccurrences: number;
  onMaxOccurrencesChange: (value: number) => void;
  useEndDate: boolean;
  onUseEndDateChange: (value: boolean) => void;
};

export function JoinCreateRecurrenceSection({
  mode,
  onModeChange,
  startDate,
  startTime,
  recurrenceEndDate,
  onRecurrenceEndDateChange,
  maxOccurrences,
  onMaxOccurrencesChange,
  useEndDate,
  onUseEndDateChange,
}: Props) {
  const dayOfWeek = startDate ? isoWeekdayFromDateKey(startDate) : 1;
  const preview =
    mode === 'WEEKLY' && startDate && startTime
      ? hostRecurringSummaryLabel({
          dayOfWeek,
          startTimeLocal: startTime,
          recurrenceStartDate: startDate,
          recurrenceEndDate: useEndDate ? recurrenceEndDate : undefined,
          maxOccurrences: useEndDate ? undefined : maxOccurrences,
        })
      : null;

  return (
    <View style={styles.wrap}>
      <Text variant="sectionTitle" tone="primary">반복 조인</Text>
      <View style={styles.row}>
        <Chip
          label="반복 안 함"
          selected={mode === 'NONE'}
          onPress={() => onModeChange('NONE')}
        />
        <Chip
          label="매주 반복"
          selected={mode === 'WEEKLY'}
          onPress={() => onModeChange('WEEKLY')}
        />
      </View>

      {mode === 'WEEKLY' ? (
        <>
          <Text variant="meta" tone="secondary">
            요일·시간은 위 일정({DAY_OF_WEEK_OPTIONS.find((d) => d.value === dayOfWeek)?.label ?? ''}{' '}
            {startTime})을 따릅니다.
          </Text>
          <View style={styles.row}>
            <Chip
              label="횟수로 종료"
              selected={!useEndDate}
              onPress={() => onUseEndDateChange(false)}
            />
            <Chip
              label="종료일"
              selected={useEndDate}
              onPress={() => onUseEndDateChange(true)}
            />
          </View>
          {useEndDate ? (
            <KstDatePickerField
              label="반복 종료일"
              dateYmd={recurrenceEndDate || startDate}
              onChange={onRecurrenceEndDateChange}
              disallowPast
            />
          ) : (
            <View style={styles.row}>
              {[4, 8, 12].map((count) => (
                <Chip
                  key={count}
                  label={`${count}회`}
                  selected={maxOccurrences === count}
                  onPress={() => onMaxOccurrencesChange(count)}
                />
              ))}
            </View>
          )}
          {preview ? (
            <Text variant="caption" tone="tertiary">
              {preview.repeatLabel} · {preview.periodLabel} · {preview.totalLabel}
              {preview.previewDates.length > 0
                ? `\n다음: ${preview.previewDates.join(', ')}`
                : ''}
            </Text>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
