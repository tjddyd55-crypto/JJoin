import { View } from 'react-native';
import { useTheme } from '../theme';
import { type SpacingToken } from '../tokens';

type Props = {
  size?: SpacingToken;
  horizontal?: boolean;
};

export function Spacer({ size = 'md', horizontal = false }: Props) {
  const theme = useTheme();
  const value = theme.spacing[size];
  return <View style={horizontal ? { width: value } : { height: value }} />;
}
