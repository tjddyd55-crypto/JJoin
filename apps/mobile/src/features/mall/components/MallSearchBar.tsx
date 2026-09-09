import { StyleSheet, View } from 'react-native';
import { Text } from '@jjoin/design-system';
import { mallColors, mallMetrics } from '../mallDesignTokens';

export function MallSearchBar() {
  return (
    <View style={styles.wrap}>
      <Text variant="body" style={styles.placeholder}>상품을 검색해보세요</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: mallMetrics.screenPadding,
    height: mallMetrics.searchHeight,
    borderRadius: mallMetrics.searchRadius,
    borderWidth: 1,
    borderColor: mallColors.border,
    backgroundColor: mallColors.surface,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  placeholder: {
    color: mallColors.textSecondary,
    fontSize: 14,
  },
});
