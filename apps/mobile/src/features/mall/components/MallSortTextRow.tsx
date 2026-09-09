import { Fragment } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@jjoin/design-system';
import type { MallSortOption } from '@jjoin/types';
import { mallColors, mallMetrics } from '../mallDesignTokens';

const OPTIONS: Array<{ key: MallSortOption; label: string }> = [
  { key: 'recommended', label: '추천순' },
  { key: 'latest', label: '최신순' },
  { key: 'coin_asc', label: '낮은 코인순' },
];

type Props = {
  value: MallSortOption;
  onChange: (value: MallSortOption) => void;
};

export function MallSortTextRow({ value, onChange }: Props) {
  return (
    <View style={styles.row}>
      {OPTIONS.map((option, index) => (
        <Fragment key={option.key}>
          <Pressable accessibilityRole="button" onPress={() => onChange(option.key)}>
            <Text style={[styles.text, value === option.key ? styles.active : undefined]}>
              {option.label}
            </Text>
          </Pressable>
          {index < OPTIONS.length - 1 ? <Text style={styles.dot}> · </Text> : null}
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: mallMetrics.screenPadding,
    marginTop: 14,
  },
  text: {
    fontSize: mallMetrics.sortTextSize,
    color: mallColors.textSecondary,
    fontWeight: '500',
  },
  active: {
    color: mallColors.textPrimary,
    fontWeight: '600',
  },
  dot: {
    fontSize: mallMetrics.sortTextSize,
    color: mallColors.textSecondary,
  },
});
