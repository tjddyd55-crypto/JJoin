import { View, StyleSheet } from 'react-native';
import { useTheme } from '../theme';

type Props = {
  inset?: boolean;
};

export function Divider({ inset = false }: Props) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: theme.colors.border.subtle,
          marginHorizontal: inset ? theme.layoutSpacing.screenHorizontal : 0,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: { height: StyleSheet.hairlineWidth },
});
