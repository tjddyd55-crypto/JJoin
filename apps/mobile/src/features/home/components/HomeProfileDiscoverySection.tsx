import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, spacing, useTheme } from '@jjoin/design-system';
import type { PublicUserProfileDto } from '@jjoin/types';

type Props = {
  profiles: PublicUserProfileDto[];
  onPressProfile: (userId: string) => void;
};

export function HomeProfileDiscoverySection({ profiles, onPressProfile }: Props) {
  const theme = useTheme();
  if (profiles.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {profiles.map((profile) => {
        const photo = profile.avatarUrl ?? profile.profilePhotos?.[0]?.imageUrl ?? null;
        return (
          <Pressable
            key={profile.id}
            accessibilityRole="button"
            accessibilityLabel={profile.nickname}
            onPress={() => onPressProfile(profile.id)}
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: theme.colors.surface.elevated,
                borderColor: theme.colors.border.subtle,
                opacity: pressed ? 0.92 : 1,
              },
            ]}
          >
            {photo ? (
              <Image source={{ uri: photo }} style={styles.photo} />
            ) : (
              <View style={[styles.photo, { backgroundColor: theme.colors.surface.soft }]} />
            )}
            <Text variant="bodyStrong" tone="primary" numberOfLines={1}>
              {profile.nickname}
            </Text>
            <Text variant="caption" tone="secondary" numberOfLines={1}>
              {profile.regionLabel ?? '함께 라운드'}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  card: {
    width: 132,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 10,
    gap: 6,
  },
  photo: {
    width: '100%',
    height: 112,
    borderRadius: 10,
  },
});
