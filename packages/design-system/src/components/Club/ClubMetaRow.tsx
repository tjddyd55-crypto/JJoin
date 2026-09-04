import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from '../../primitives/Text';

export type ClubMetaRowProps = {
  label: string;
  style?: StyleProp<ViewStyle>;
};

export function ClubMetaRow({ label, style }: ClubMetaRowProps) {
  return (
    <View style={[styles.root, style]}>
      <Text variant="clubMeta" tone="tertiary" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    minWidth: 0,
  },
});
