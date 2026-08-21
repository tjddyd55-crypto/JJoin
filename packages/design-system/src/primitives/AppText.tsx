import { Text, type TextProps, type TextStyle } from 'react-native';
import { colors, typography } from '../tokens';

type Variant = keyof typeof typography;

type Props = TextProps & {
  variant?: Variant;
  color?: keyof typeof colors;
};

export function AppText({
  variant = 'body',
  color = 'textPrimary',
  style,
  ...rest
}: Props) {
  const tokenStyle = typography[variant] as TextStyle;
  return <Text {...rest} style={[tokenStyle, { color: colors[color] }, style]} />;
}

