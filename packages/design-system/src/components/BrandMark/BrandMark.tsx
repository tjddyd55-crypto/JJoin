import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from '../../primitives/Text';
import { useTheme } from '../../theme';

export type BrandMarkVariant = 'horizontal' | 'compact' | 'compactHeader' | 'symbol';
export type BrandMarkTone = 'default' | 'inverse' | 'onLime' | 'premium';

type Props = {
  variant?: BrandMarkVariant;
  tone?: BrandMarkTone;
  /** Optional DEV badge next to compact mark */
  showDevBadge?: boolean;
  style?: StyleProp<ViewStyle>;
};

function WordmarkText({
  size,
  navy,
  lime,
}: {
  size: number;
  navy: string;
  lime: string;
}) {
  return (
    <Text
      variant="sectionTitle"
      style={{
        color: navy,
        fontSize: size,
        lineHeight: size + 6,
        letterSpacing: -0.8,
        fontWeight: '700',
      }}
    >
      <Text
        style={{
          color: lime,
          fontSize: size,
          lineHeight: size + 6,
          fontWeight: '700',
          letterSpacing: -0.8,
        }}
      >
        쪼
      </Text>
      인존
    </Text>
  );
}

/**
 * Official user-facing brand: 쪼인존
 * Hangul wordmark only — lime accent on 쪼.
 */
export function BrandMark({
  variant = 'horizontal',
  tone = 'default',
  showDevBadge = false,
  style,
}: Props) {
  const theme = useTheme();

  const navy =
    tone === 'inverse'
      ? theme.colors.text.inverse
      : tone === 'premium'
        ? theme.premium.text
        : theme.colors.text.primary;
  const lime =
    tone === 'premium' ? theme.premium.gold : theme.colors.brand.limeAccent;

  const size =
    variant === 'symbol'
      ? 16
      : variant === 'compactHeader'
        ? 18
        : variant === 'compact'
          ? 20
          : 26;

  return (
    <View
      style={[styles.row, style]}
      accessibilityRole="header"
      accessibilityLabel={showDevBadge ? '쪼인존 DEV' : '쪼인존'}
    >
      <WordmarkText size={size} navy={navy} lime={lime} />
      {showDevBadge ? (
        <View
          style={[
            styles.devBadge,
            variant === 'compactHeader' ? styles.devBadgeCompact : null,
            {
              backgroundColor: theme.colors.surface.soft,
              borderColor: theme.colors.border.subtle,
              borderRadius: theme.radius.sm,
            },
          ]}
        >
          <Text variant="caption" tone="tertiary">
            DEV
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  devBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: StyleSheet.hairlineWidth,
  },
  devBadgeCompact: {
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
});
