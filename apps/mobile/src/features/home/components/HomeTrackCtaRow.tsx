import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Text, spacing, useTheme } from '@jjoin/design-system';

type TrackCta = {
  title: string;
  subtitle: string;
  href: Href;
};

const TRACKS: TrackCta[] = [
  {
    title: '필드 조인',
    subtitle: '코스에서 함께 라운드',
    href: { pathname: '/(tabs)/joins', params: { venueType: 'FIELD' } } as Href,
  },
  {
    title: '스크린 조인',
    subtitle: '스크린에서 가볍게',
    href: { pathname: '/(tabs)/joins', params: { venueType: 'SCREEN' } } as Href,
  },
];

export function HomeTrackCtaRow() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <View style={styles.row}>
      {TRACKS.map((track) => (
        <Pressable
          key={track.title}
          accessibilityRole="button"
          accessibilityLabel={track.title}
          onPress={() => router.push(track.href)}
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: theme.colors.surface.elevated,
              borderColor: theme.colors.border.subtle,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <Text variant="sectionTitle" tone="primary">
            {track.title}
          </Text>
          <Text variant="caption" tone="secondary">
            {track.subtitle}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  card: {
    flex: 1,
    minHeight: 92,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    justifyContent: 'center',
    gap: 6,
  },
});
