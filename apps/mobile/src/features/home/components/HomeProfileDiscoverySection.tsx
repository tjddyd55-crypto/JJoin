import { Pressable, StyleSheet, View } from 'react-native';
import { ProfileAvatar, Text, spacing, useTheme } from '@jjoin/design-system';
import type { GolfFriendCardDto } from '@jjoin/types';
import { MemberActionMenu } from '../../member/components/MemberActionMenu';

type Props = {
  items: GolfFriendCardDto[];
  initialLoading: boolean;
  hasLoadedOnce: boolean;
  viewerUserId?: string | null;
  coinGiftEnabled?: boolean;
  messagingEnabled?: boolean;
  onPressProfile: (userId: string) => void;
};

function formatUserSubtitle(item: GolfFriendCardDto): string {
  const profile = item.user;
  const meta = [profile.genderDisplay, profile.ageBand ?? (profile.age != null ? `${profile.age}세` : null)]
    .filter(Boolean)
    .join(' · ');
  const sport = profile.sportProfiles[0];
  const sportLine = sport ? `${sport.sportCode} · ${sport.skillLevel}` : null;
  const region = profile.regionLabel ?? '활동지역 미정';
  const distance =
    item.approxDistanceMeters != null
      ? `약 ${Math.round(item.approxDistanceMeters / 100) / 10}km`
      : null;
  return [meta, sportLine, [region, distance].filter(Boolean).join(' · ')].filter(Boolean).join('\n');
}

export function HomeProfileDiscoverySection({
  items,
  initialLoading,
  hasLoadedOnce,
  viewerUserId,
  coinGiftEnabled = true,
  messagingEnabled = true,
  onPressProfile,
}: Props) {
  const theme = useTheme();

  if (initialLoading && !hasLoadedOnce) {
    return (
      <View style={[styles.placeholder, { backgroundColor: theme.colors.surface.soft }]} />
    );
  }

  if (items.length === 0 && hasLoadedOnce) {
    return (
      <View style={styles.emptyBlock}>
        <Text variant="joinMeta" tone="secondary">함께할 회원을 찾아보세요</Text>
      </View>
    );
  }

  return (
    <View style={styles.stack}>
      {items.map((item) => (
        <Pressable
          key={item.user.id}
          accessibilityRole="button"
          accessibilityLabel={item.user.nickname}
          onPress={() => onPressProfile(item.user.id)}
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: theme.colors.surface.elevated,
              borderColor: theme.colors.border.subtle,
              opacity: pressed ? 0.92 : 1,
            },
          ]}
        >
          <ProfileAvatar
            imageUrl={item.user.avatarUrl}
            name={item.user.nickname}
            size="md"
          />
          <View style={styles.body}>
            <Text variant="bodyStrong" tone="primary" numberOfLines={1}>
              {item.user.nickname}
            </Text>
            <Text variant="caption" tone="secondary" numberOfLines={3}>
              {formatUserSubtitle(item)}
            </Text>
            <MemberActionMenu
              targetUserId={item.user.id}
              nickname={item.user.nickname}
              viewerUserId={viewerUserId}
              variant="compact"
              coinGiftEnabled={coinGiftEnabled}
              messagingEnabled={messagingEnabled}
            />
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: spacing.sm,
  },
  body: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  emptyBlock: {
    minHeight: 72,
    justifyContent: 'center',
    paddingVertical: spacing.xs,
  },
  placeholder: {
    minHeight: 88,
    borderRadius: 14,
  },
});
