import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, stickyActionBottomPadding, STICKY_ACTION_TOP_PADDING } from '@jjoin/design-system';
import { formatNumber } from '@jjoin/domain';
import { mallColors, mallMetrics } from '../mallDesignTokens';

type Props = {
  shortageCoin?: string | null;
  buttonLabel: string;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
};

export function MallStickyPurchaseBar({
  shortageCoin,
  buttonLabel,
  disabled,
  loading,
  onPress,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        {
          paddingTop: STICKY_ACTION_TOP_PADDING,
          paddingBottom: stickyActionBottomPadding(insets.bottom),
        },
      ]}
    >
      {shortageCoin ? (
        <Text style={styles.shortage}>{formatNumber(shortageCoin)} 코인 부족</Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled || loading}
        onPress={onPress}
        style={[styles.button, disabled ? styles.buttonDisabled : undefined]}
      >
        <Text style={styles.buttonLabel}>{loading ? '처리 중…' : buttonLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: 1,
    borderTopColor: mallColors.border,
    backgroundColor: mallColors.surface,
    paddingHorizontal: mallMetrics.screenPadding,
  },
  shortage: {
    fontSize: 12,
    fontWeight: '600',
    color: mallColors.danger,
    marginBottom: 10,
  },
  button: {
    height: mallMetrics.ctaHeight,
    borderRadius: mallMetrics.ctaRadius,
    backgroundColor: mallColors.accentLime,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
    minWidth: 160,
  },
  buttonDisabled: { opacity: 0.55 },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: mallColors.textPrimary,
  },
});
