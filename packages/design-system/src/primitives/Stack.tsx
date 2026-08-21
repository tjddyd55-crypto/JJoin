import { View, type ViewProps, type ViewStyle } from 'react-native';
import { spacing, type SpacingToken } from '../tokens';

type Props = ViewProps & {
  gap?: SpacingToken;
  pad?: SpacingToken;
  direction?: 'row' | 'column';
  align?: ViewStyle['alignItems'];
  justify?: ViewStyle['justifyContent'];
};

export function Stack({
  gap = 'sm',
  pad,
  direction = 'column',
  align,
  justify,
  style,
  ...rest
}: Props) {
  return (
    <View
      {...rest}
      style={[
        {
          flexDirection: direction,
          gap: spacing[gap],
          padding: pad ? spacing[pad] : undefined,
          alignItems: align,
          justifyContent: justify,
        },
        style,
      ]}
    />
  );
}

