import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme';
import { sizes } from '../../tokens';

function Bone({ width, height, radius = 8 }: { width: number | `${number}%`; height: number; radius?: number }) {
  const theme = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width,
        height,
        borderRadius: radius,
        backgroundColor: theme.colors.surface.soft,
      }}
    />
  );
}

export function ClubCardSkeleton() {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="동호회 불러오는 중"
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface.card,
          borderBottomColor: theme.colors.border.subtle,
        },
      ]}
    >
      <Bone width={sizes.clubCover.list} height={sizes.clubCover.list} radius={15} />
      <View style={styles.body}>
        <Bone width="78%" height={22} radius={6} />
        <Bone width="92%" height={18} radius={6} />
        <Bone width="64%" height={16} radius={6} />
        <Bone width="48%" height={14} radius={6} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 108,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  body: {
    flex: 1,
    gap: 6,
    minWidth: 0,
    paddingTop: 4,
  },
});
