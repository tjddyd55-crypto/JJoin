import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, Text, useTheme } from '@jjoin/design-system';

export type MapVenueMarkerProps = {
  selected?: boolean;
  caption?: string;
  /** Visual-only preview for catalog / overlays — native Kakao markers stay in adapter. */
  kind?: 'venue' | 'user' | 'me';
};

/**
 * Club Minimal marker chrome for overlays / catalog.
 * Native Kakao map pins remain owned by KakaoMapAdapter.
 */
export function MapVenueMarker({ selected = false, caption, kind = 'venue' }: MapVenueMarkerProps) {
  const theme = useTheme();
  const size = selected ? 44 : 36;
  const bg =
    kind === 'me'
      ? theme.colors.status.info
      : kind === 'user'
        ? theme.colors.surface.floating
        : theme.colors.action.primary;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <View
        style={[
          styles.pin,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: bg,
            borderColor: selected ? theme.colors.text.primary : 'transparent',
            borderWidth: selected ? 2 : 0,
          },
        ]}
      >
        <Icon
          name={kind === 'me' ? 'currentLocation' : kind === 'user' ? 'people' : 'golf'}
          size="sm"
          tone={kind === 'venue' ? 'inverse' : 'primary'}
        />
      </View>
      {caption ? (
        <View style={[styles.badge, { backgroundColor: theme.colors.surface.elevated }]}>
          <Text variant="caption" tone="primary">
            {caption}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function CurrentLocationControl({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="현재 위치로 이동"
      hitSlop={4}
      style={[
        styles.fab,
        {
          backgroundColor: theme.colors.surface.elevated,
          borderColor: theme.colors.border.subtle,
          borderRadius: theme.radius.full,
        },
      ]}
    >
      <Icon name="currentLocation" size="md" tone="gold" />
    </Pressable>
  );
}

export function ReSearchAreaControl({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[
        styles.reSearch,
        {
          backgroundColor: theme.colors.surface.elevated,
          borderColor: theme.colors.action.primary,
          borderRadius: theme.radius.full,
        },
      ]}
    >
      <Text variant="caption" style={{ color: theme.colors.action.primary }}>
        이 지역 재검색
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  pin: { alignItems: 'center', justifyContent: 'center' },
  badge: {
    marginTop: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  fab: {
    width: 48,
    height: 48,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reSearch: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
});
