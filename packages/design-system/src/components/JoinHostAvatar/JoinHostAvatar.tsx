import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Text } from '../../primitives/Text';
import { BrandMark } from '../BrandMark';
import { useTheme } from '../../theme';

export type JoinHostAvatarSize = 'md' | 'lg';

export type JoinHostAvatarProps = {
  profileImageUrl?: string | null;
  hostName?: string | null;
  size?: JoinHostAvatarSize;
  showHostBadge?: boolean;
  /** Always brand logo when profile missing or load fails — never initials/silhouette. */
  fallback?: 'brand';
};

export function JoinHostAvatar({
  profileImageUrl,
  hostName,
  size = 'md',
  showHostBadge = false,
  fallback = 'brand',
}: JoinHostAvatarProps) {
  const theme = useTheme();
  const pixel = size === 'lg' ? theme.sizes.avatar.joinHostLg : theme.sizes.avatar.joinHost;
  const [imageFailed, setImageFailed] = useState(false);
  const showProfile = profileImageUrl && !imageFailed;

  return (
    <View style={[styles.wrap, { width: pixel, height: pixel }]}>
      <View
        style={[
          styles.plate,
          {
            width: pixel,
            height: pixel,
            borderRadius: theme.radius.md,
            backgroundColor: showProfile
              ? theme.colors.surface.elevated
              : theme.colors.state.selectedSurface,
            borderColor: theme.colors.border.subtle,
          },
        ]}
      >
        {showProfile ? (
          <Image
            source={{ uri: profileImageUrl }}
            style={{ width: pixel, height: pixel, borderRadius: theme.radius.md }}
            resizeMode="cover"
            accessibilityLabel={hostName ? `${hostName} 프로필` : '방장 프로필'}
            onError={() => setImageFailed(true)}
          />
        ) : fallback === 'brand' ? (
          <BrandMark variant="symbol" tone="default" style={styles.brand} />
        ) : null}
      </View>
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
  plate: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  brand: {
    transform: [{ scale: 0.85 }],
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
