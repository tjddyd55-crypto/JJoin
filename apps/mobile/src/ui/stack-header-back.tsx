import { Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Icon } from '@jjoin/design-system';
import { popStackOrParent, type NavLike } from './stack-navigation';

export type { NavLike } from './stack-navigation';
export { popStackOrParent } from './stack-navigation';

export function StackHeaderBackButton({ navigation }: { navigation: NavLike }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="뒤로"
      hitSlop={12}
      onPress={() =>
        popStackOrParent(navigation, () => router.back(), () => router.canGoBack())
      }
      style={styles.button}
      testID="stack-header-back"
    >
      <Icon name="back" size="md" tone="primary" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 4,
    paddingVertical: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
