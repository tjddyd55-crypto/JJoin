import { Image, StyleSheet, View } from 'react-native';
import { Text, useTheme } from '@jjoin/design-system';

type Props = {
  uri?: string | null;
  height?: number;
  label?: string;
};

export function ClubPlaceholderImage({ uri, height = 160, label = '쪼인존' }: Props) {
  const theme = useTheme();

  if (uri) {
    return <Image source={{ uri }} style={[styles.image, { height }]} />;
  }

  return (
    <View
      style={[
        styles.placeholder,
        {
          height,
          backgroundColor: theme.colors.surface.elevated,
          borderColor: theme.colors.border.subtle,
        },
      ]}
    >
      <Text variant="caption" tone="tertiary">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    borderRadius: 12,
  },
  placeholder: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
