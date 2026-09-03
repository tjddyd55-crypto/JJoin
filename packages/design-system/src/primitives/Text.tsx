import { Text as RNText, type TextProps, type TextStyle } from 'react-native';
import { useTheme } from '../theme';
import { typography, type TypographyVariant } from '../tokens';

type SemanticColor =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'inverse'
  | 'onPrimary'
  | 'onGold'
  | 'success'
  | 'warning'
  | 'error'
  | 'info';

type Props = TextProps & {
  variant?: TypographyVariant;
  tone?: SemanticColor;
};

function resolveToneColor(tone: SemanticColor, theme: ReturnType<typeof useTheme>): string {
  switch (tone) {
    case 'primary':
      return theme.colors.text.primary;
    case 'secondary':
      return theme.colors.text.secondary;
    case 'tertiary':
      return theme.colors.text.tertiary;
    case 'inverse':
      return theme.colors.text.inverse;
    case 'onPrimary':
    case 'onGold':
      return theme.colors.text.onPrimary;
    case 'success':
      return theme.colors.status.success;
    case 'warning':
      return theme.colors.status.warning;
    case 'error':
      return theme.colors.status.error;
    case 'info':
      return theme.colors.status.info;
    default:
      return theme.colors.text.primary;
  }
}

export function Text({
  variant = 'body',
  tone = 'primary',
  style,
  ...rest
}: Props) {
  const theme = useTheme();
  const tokenStyle = typography[variant] as TextStyle;
  return (
    <RNText {...rest} style={[tokenStyle, { color: resolveToneColor(tone, theme) }, style]} />
  );
}
