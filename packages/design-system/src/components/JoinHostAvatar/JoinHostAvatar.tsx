import { StyleSheet, View } from 'react-native';
import { Text } from '../../primitives/Text';
import { ProfileAvatar, resolveProfileAvatarPixel, type ProfileAvatarFallback, type ProfileAvatarSize } from '../ProfileAvatar';
import { useTheme } from '../../theme';

export type JoinHostAvatarSize = ProfileAvatarSize;

export type JoinHostAvatarProps = {
  profileImageUrl?: string | null;
  hostName?: string | null;
  size?: JoinHostAvatarSize;
  showHostBadge?: boolean;
  /** Always brand logo when profile missing or load fails — never initials/silhouette. */
  fallback?: ProfileAvatarFallback;
};

export function JoinHostAvatar({
  profileImageUrl,
  hostName,
  size = 'md',
  showHostBadge = false,
  fallback = 'brand',
}: JoinHostAvatarProps) {
  const theme = useTheme();
  const pixel = resolveProfileAvatarPixel(size, theme.sizes.avatar);

  return (
    <View style={[styles.wrap, { width: pixel, height: pixel }]}>
      <ProfileAvatar
        imageUrl={profileImageUrl}
        name={hostName}
        size={size}
        fallback={fallback}
        accessibilityLabel={hostName ? `${hostName} 프로필` : '방장 프로필'}
      />
      {showHostBadge ? (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: theme.colors.surface.card,
              borderColor: theme.colors.border.subtle,
              borderRadius: theme.radius.xs,
            },
          ]}
        >
          <Text variant="caption" tone="secondary">
            방장
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
