import { View, type ViewProps, type ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { type SpacingToken } from '../tokens';

type Props = ViewProps & {
  pad?: SpacingToken;
  padX?: SpacingToken;
  padY?: SpacingToken;
  radius?: keyof typeof import('../tokens').radius;
  background?: keyof ReturnType<typeof useTheme>['colors']['surface'];
};

export function Box({
  pad,
  padX,
  padY,
  radius: radiusKey,
  background,
  style,
  ...rest
}: Props) {
  const theme = useTheme();
  const padStyle: ViewStyle = {};
  if (pad) padStyle.padding = theme.spacing[pad];
  if (padX) padStyle.paddingHorizontal = theme.spacing[padX];
  if (padY) padStyle.paddingVertical = theme.spacing[padY];

  return (
    <View
      {...rest}
      style={[
        padStyle,
        radiusKey ? { borderRadius: theme.radius[radiusKey] } : null,
        background ? { backgroundColor: theme.colors.surface[background] } : null,
        style,
      ]}
    />
  );
}
