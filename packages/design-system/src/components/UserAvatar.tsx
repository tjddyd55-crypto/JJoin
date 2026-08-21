import { View, StyleSheet, Image } from 'react-native';
import { AppText } from '../primitives/AppText';
import { colors, sizing, radius } from '../tokens';

type Props = {
  uri?: string | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
};

export function UserAvatar({ uri, name, size = 'md' }: Props) {
  const dim =
    size === 'sm' ? sizing.avatarSm : size === 'lg' ? sizing.avatarLg : sizing.avatarMd;
  const initial = (name ?? '?').trim().charAt(0).toUpperCase();

  if (uri) {
    return <Image source={{ uri }} style={{ width: dim, height: dim, borderRadius: dim / 2 }} />;
  }

  return (
    <View style={[styles.fallback, { width: dim, height: dim, borderRadius: dim / 2 }]}>
      <AppText variant="label" color="primary">
        {initial}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
});

