import { View, StyleSheet, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme';

export type ScreenFrameProps = ViewProps & {
  padded?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
};

export function ScreenFrame({
  padded = true,
  edges = ['top', 'left', 'right'],
  style,
  children,
  ...rest
}: ScreenFrameProps) {
  const theme = useTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.app.background }]} edges={edges}>
      <View
        style={[
          styles.root,
          { backgroundColor: theme.colors.app.background },
          padded && { paddingHorizontal: theme.layoutSpacing.screenHorizontal },
          style,
        ]}
        {...rest}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  root: { flex: 1 },
});
