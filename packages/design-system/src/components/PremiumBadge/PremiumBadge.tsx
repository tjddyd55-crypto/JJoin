import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from '../../primitives/Text';
import { useTheme } from '../../theme';

type Props = {
  label?: string;
  style?: StyleProp<ViewStyle>;
};

/** Premium-only badge — Black & Gold tokens, not general Bright UI. */
export function PremiumBadge({ label = 'PREMIUM', style }: Props) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: theme.premium.badge,
          borderColor: theme.premium.gold,
          borderRadius: theme.radius.sm,
        },
        style,
      ]}
    >
      <Text variant="caption" style={{ color: theme.premium.gold, fontWeight: '700' }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
