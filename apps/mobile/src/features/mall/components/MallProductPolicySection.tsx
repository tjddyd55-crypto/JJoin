import { useState } from 'react';
import { Pressable, StyleSheet, Text as RNText, View } from 'react-native';
import type { MallProductDetailDto } from '@jjoin/types';
import { mallColors, mallMetrics } from '../mallDesignTokens';
import { buildMallPolicyRows } from '../mallProductPolicy';

type Props = {
  product: MallProductDetailDto;
};

export function MallProductPolicySection({ product }: Props) {
  const rows = buildMallPolicyRows(product);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  if (rows.length === 0) return null;

  return (
    <View style={styles.section}>
      <RNText style={styles.sectionHeading}>이용 및 정책 안내</RNText>
      <View style={styles.rows}>
        {rows.map((item, index) => {
          const expanded = expandedKey === item.key;
          return (
            <View key={item.key}>
              <Pressable
                style={styles.row}
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                onPress={() => setExpandedKey(expanded ? null : item.key)}
              >
                <RNText style={styles.rowLabel}>{item.label}</RNText>
                <RNText style={styles.chevron}>{expanded ? '⌄' : '›'}</RNText>
              </Pressable>
              {expanded ? <RNText style={styles.rowBody}>{item.body}</RNText> : null}
              {index < rows.length - 1 ? <View style={styles.rowDivider} /> : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 28,
    paddingHorizontal: mallMetrics.screenPadding,
    gap: 12,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: '700',
    color: mallColors.textPrimary,
    lineHeight: 24,
  },
  rows: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingVertical: 10,
    gap: 12,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: mallColors.textPrimary,
    lineHeight: 20,
  },
  chevron: {
    fontSize: 20,
    color: mallColors.textSecondary,
    lineHeight: 22,
  },
  rowBody: {
    paddingBottom: 12,
    fontSize: 14,
    color: mallColors.textSecondary,
    lineHeight: 21,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: mallColors.border,
  },
});
