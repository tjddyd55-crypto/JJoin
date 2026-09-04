import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Text } from '../../primitives/Text';
import { BrandMark } from '../BrandMark';
import { useTheme } from '../../theme';
import { resolveProfileAvatarPixel } from './profile-avatar-sizes';
import type { ProfileAvatarSize } from './profile-avatar-sizes';

export type { ProfileAvatarSize } from './profile-avatar-sizes';

export type ProfileAvatarFallback = 'brand' | 'initial';

export type ProfileAvatarProps = {
  imageUrl?: string | null;
  name?: string | null;
  size?: ProfileAvatarSize;
  fallback?: ProfileAvatarFallback;
  accessibilityLabel?: string;
};

export function ProfileAvatar({
  imageUrl,
  name,
  size = 'md',
  fallback = 'brand',
  accessibilityLabel,
}: ProfileAvatarProps) {
  const theme = useTheme();
  const pixel = resolveProfileAvatarPixel(size, theme.sizes.avatar);
  const radius = pixel / 2;
  const [imageFailed, setImageFailed] = useState(false);
  const showProfile = imageUrl && !imageFailed;
  const initial = (name ?? '?').trim().charAt(0).toUpperCase();
  const a11y = accessibilityLabel ?? (name ? `${name} 프로필` : '프로필');

  return (
    <View
      style={[
        styles.plate,
        {
          width: pixel,
          height: pixel,
          borderRadius: radius,
          backgroundColor: showProfile
            ? theme.colors.surface.elevated
            : theme.colors.state.selectedSurface,
          borderColor: theme.colors.border.subtle,
        },
      ]}
    >
      {showProfile ? (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: pixel, height: pixel, borderRadius: radius }}
          resizeMode="cover"
          accessibilityLabel={a11y}
          onError={() => setImageFailed(true)}
        />
      ) : fallback === 'brand' ? (
        <BrandMark
          variant="symbol"
          tone="default"
          style={{ transform: [{ scale: pixel < 50 ? 0.7 : 0.85 }] }}
        />
      ) : (
        <Text variant="caption" tone="secondary">
          {initial}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  plate: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
