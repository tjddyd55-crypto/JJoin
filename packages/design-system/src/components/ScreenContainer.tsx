import { View, StyleSheet, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { spacing } from '../tokens';

type Props = ViewProps & {
  padded?: boolean;
};

/** Legacy screen shell — now follows Club Minimal dark theme via useTheme(). */
export function ScreenContainer({ padded = true, style, children, ...rest }: Props) {
  const theme = useTheme();
  const backgroundColor = theme.colors.app.background;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor }]} edges={['top', 'left', 'right']}>
      <View
        style={[styles.root, { backgroundColor }, padded && styles.padded, style]}
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
  padded: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
});
