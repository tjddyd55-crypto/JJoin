import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Text } from '../../primitives/Text';
import { useTheme } from '../../theme';

export type BrandMarkVariant = 'horizontal' | 'compact' | 'symbol';
export type BrandMarkTone = 'default' | 'inverse' | 'onLime' | 'premium';

type Props = {
  variant?: BrandMarkVariant;
  tone?: BrandMarkTone;
  /** Optional DEV badge next to compact mark */
  showDevBadge?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** ㅉ-inspired join monogram — two linked uprights (people joining). */
function JjMonogram({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" accessibilityElementsHidden>
      <Path
        d="M8 6v14.5c0 3.2 2.2 5.5 5.2 5.5H14"
        stroke={color}
        strokeWidth={3.2}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M24 6v14.5c0 3.2-2.2 5.5-5.2 5.5H18"
        stroke={color}
        strokeWidth={3.2}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M12.5 18.5h7"
        stroke={color}
        strokeWidth={3.2}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

/**
 * Official user-facing brand: 쪼인존
 * Hangul wordmark is text (correct glyphs); lime accent on 쪼 only.
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
  const monogramColor = tone === 'onLime' ? theme.colors.text.onPrimary : navy;

  if (variant === 'symbol') {
    return (
      <View style={[styles.symbolWrap, style]} accessibilityLabel="쪼인존">
        <JjMonogram color={monogramColor} size={28} />
      </View>
    );
  }

  const size = variant === 'compact' ? 20 : 26;

  return (
    <View
      style={[styles.row, style]}
      accessibilityRole="header"
      accessibilityLabel={showDevBadge ? '쪼인존 DEV' : '쪼인존'}
    >
      <JjMonogram color={monogramColor} size={size + 2} />
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
      {showDevBadge ? (
        <View
          style={[
            styles.devBadge,
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
  symbolWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  devBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
